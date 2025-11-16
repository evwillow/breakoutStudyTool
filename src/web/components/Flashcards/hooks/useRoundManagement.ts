/**
 * @fileoverview Hook for managing round creation, loading, and selection.
 * @module src/web/components/Flashcards/hooks/useRoundManagement.ts
 */
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useOptimisticSession } from "@/lib/hooks/useOptimisticSession";
import { TIMER_CONFIG } from "@/config/game.config";

declare global {
  interface Window {
    __roundCache?: Record<string, { rounds: any[]; fetchedAt: number }>;
    __matchCache?: Record<string, any>;
  }
}

export interface UseRoundManagementReturn {
  currentRoundId: string | null;
  isCreatingRound: boolean;
  isLoadingRounds: boolean;
  availableRounds: any[];
  roundsLoaded: boolean; // Track if rounds have been loaded at least once
  showRoundSelector: boolean;
  roundNameInput: string;
  setShowRoundSelector: (show: boolean) => void;
  setRoundNameInput: (name: string) => void;
  createNewRound: (name?: string, datasetName?: string) => Promise<string | null>;
  loadRecentRounds: (datasetName: string, autoCreateForTutorial?: boolean) => Promise<void>;
  loadRoundMatches: (roundId: string) => Promise<any[]>;
  handleNewRound: () => void;
  handleConfirmNewRound: () => Promise<void>;
  handleSelectRound: (roundId: string, datasetName?: string) => Promise<void>;
  handleRoundSelectorSelect: (roundId: string, datasetName: string) => void;
  handleRoundSelectorCancel: () => void;
  handleRoundNameChange: (value: string) => void;
  handleGenerateRoundName: () => string;
  generateRoundName: () => string;
  loadPendingRoundIfReady: (flashcardsReady: boolean, selectedFolder: string | null) => void;
}

export function useRoundManagement(
  selectedFolder: string | null,
  gameState: any,
  timer: any,
  timerDuration: number
): UseRoundManagementReturn {
  const { data: session } = useOptimisticSession();
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [isCreatingRound, setIsCreatingRound] = useState(false);
  const [isLoadingRounds, setIsLoadingRounds] = useState(false);
  const [availableRounds, setAvailableRounds] = useState<any[]>([]);
  const [showRoundSelector, setShowRoundSelector] = useState(false);
  const [roundNameInput, setRoundNameInput] = useState('');
  const [roundsLoaded, setRoundsLoaded] = useState(false); // Track if rounds have been loaded at least once
  const pendingRoundRef = useRef<{ roundId: string; datasetName: string } | null>(null);
  const lastLoadedRef = useRef<{ folder: string | null; userId: string | null }>({ folder: null, userId: null });

  // CRITICAL: Prevent duplicate round creation with guards
  const isCreatingRoundRef = useRef(false);
  const activeRoundCreationPromiseRef = useRef<Promise<string | null> | null>(null);

  const generateRoundName = useCallback(() => {
    const date = new Date();
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${dateStr} ${timeStr}`;
  }, []);

  const createNewRound = useCallback(async (name?: string, datasetName?: string): Promise<string | null> => {
    const folder = datasetName || selectedFolder;
    if (!session?.user?.id || !folder) {
      return null;
    }

    // CRITICAL: Prevent duplicate creation - if already creating, return the existing promise
    if (isCreatingRoundRef.current && activeRoundCreationPromiseRef.current) {
      console.log('[useRoundManagement] Round creation already in progress, returning existing promise');
      return activeRoundCreationPromiseRef.current;
    }

    // Mark as creating
    isCreatingRoundRef.current = true;
    setIsCreatingRound(true);

    // Create the promise and store it
    const creationPromise = (async () => {
      try {
        const response = await fetch('/api/game/rounds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataset_name: folder,
            user_id: session.user.id,
            name: name || undefined,
            completed: false,
          }),
        });

        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          console.error('Round creation failed', result);
          return null;
        }

        const result = await response.json();
        const roundId = result.data?.id || null;
        console.log('[useRoundManagement] Round created successfully:', roundId);
        return roundId;
      } catch (error) {
        console.error('Error creating round:', error);
        return null;
      } finally {
        // Reset guards
        isCreatingRoundRef.current = false;
        activeRoundCreationPromiseRef.current = null;
        setIsCreatingRound(false);
      }
    })();

    activeRoundCreationPromiseRef.current = creationPromise;
    return creationPromise;
  }, [session?.user?.id, selectedFolder]);

  const loadRoundMatches = useCallback(async (roundId: string): Promise<any[]> => {
    try {
      const response = await fetch(`/api/game/matches?roundId=${roundId}`);
      if (response.ok) {
        const result = await response.json();
        return result.data || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching matches:', error);
      return [];
    }
  }, []);

  // Track active round loading to prevent duplicate calls
  const loadRoundsAbortControllerRef = useRef<AbortController | null>(null);
  const lastLoadRoundsCallRef = useRef<{ datasetName: string; userId: string; timestamp: number } | null>(null);

  const loadRecentRounds = useCallback(async (datasetName: string, autoCreateForTutorial = false): Promise<void> => {
    if (!session?.user?.id || !datasetName) return;

    const userId = session.user.id;
    const cacheKey = `${userId}_${datasetName}`;

    // CRITICAL: Debounce rapid successive calls (within 100ms)
    const now = Date.now();
    if (lastLoadRoundsCallRef.current &&
        lastLoadRoundsCallRef.current.datasetName === datasetName &&
        lastLoadRoundsCallRef.current.userId === userId &&
        now - lastLoadRoundsCallRef.current.timestamp < 100) {
      console.log('[useRoundManagement] Ignoring duplicate loadRecentRounds call (debounced)');
      return;
    }
    lastLoadRoundsCallRef.current = { datasetName, userId, timestamp: now };

    if (!window.__roundCache) {
      window.__roundCache = {};
    }
    const roundCache = window.__roundCache;

    // Check cache - instant load if valid
    if (!autoCreateForTutorial && roundCache[cacheKey]) {
      const cached = roundCache[cacheKey];
      const cacheAge = Date.now() - cached.fetchedAt;
      // Increased cache time from 30s to 5 minutes for faster loads
      if (cacheAge < 5 * 60 * 1000) {
        console.log('[useRoundManagement] Loading rounds from cache (instant)');
        setAvailableRounds(cached.rounds || []);
        setRoundsLoaded(true);
        const mostRecent = cached.rounds?.find((r: any) => !r.completed) || cached.rounds?.[0];
        if (mostRecent && !pendingRoundRef.current) {
          setCurrentRoundId(mostRecent.id);
        }
        setIsLoadingRounds(false);
        return;
      }
    }

    // Cancel any in-flight request
    if (loadRoundsAbortControllerRef.current) {
      console.log('[useRoundManagement] Aborting previous loadRecentRounds request');
      loadRoundsAbortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    loadRoundsAbortControllerRef.current = abortController;

    setIsLoadingRounds(true);
    try {
      const url = `/api/game/rounds?userId=${encodeURIComponent(userId)}&datasetName=${encodeURIComponent(datasetName)}&limit=5`;
      // HTTP cache headers are set on the API route for fast loads
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: abortController.signal,
        keepalive: true
      });

      // Check if aborted
      if (abortController.signal.aborted) {
        console.log('[useRoundManagement] Request was aborted');
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        // Only create if not aborted and not already creating
        if (!abortController.signal.aborted && !isCreatingRoundRef.current) {
          const autoName = generateRoundName();
          const newRoundId = await createNewRound(autoName, datasetName);
          if (newRoundId) setCurrentRoundId(newRoundId);
        }
        return;
      }

      const rounds = result.data || [];
      const validRounds = rounds.filter((r: any) => r.user_id === userId);
      setAvailableRounds(validRounds);
      setRoundsLoaded(true);
      roundCache[cacheKey] = { rounds: validRounds, fetchedAt: Date.now() };

      if (pendingRoundRef.current) return;

      const mostRecentIncomplete = rounds.find((r: any) => !r.completed);
      if (mostRecentIncomplete && !autoCreateForTutorial) {
        setCurrentRoundId(mostRecentIncomplete.id);

        // OPTIMIZED: Load matches in parallel with setting up the round
        // Check match cache first for instant load
        if (!window.__matchCache) window.__matchCache = {};
        const matchCacheKey = mostRecentIncomplete.id;
        const cachedMatches = window.__matchCache[matchCacheKey];

        if (cachedMatches && Date.now() - cachedMatches.fetchedAt < 2 * 60 * 1000) {
          // Use cached matches (2min cache)
          console.log('[useRoundManagement] Loading matches from cache (instant)');
          if (cachedMatches.matches.length > 0) {
            gameState.initializeFromMatches(cachedMatches.matches);
          }
        } else {
          // Load matches from API
          const matches = await loadRoundMatches(mostRecentIncomplete.id);
          if (matches.length > 0) {
            window.__matchCache[matchCacheKey] = { matches, fetchedAt: Date.now() };
            gameState.initializeFromMatches(matches);
          }
        }

        timer.reset(timerDuration);
        if (timerDuration > 0) {
          requestAnimationFrame(() => timer.start());
        }
      } else if (rounds.length > 0 && !autoCreateForTutorial) {
        setShowRoundSelector(true);
      } else {
        // Only create if not already creating
        if (!isCreatingRoundRef.current) {
          const autoName = generateRoundName();
          const newRoundId = await createNewRound(autoName, datasetName);
          if (newRoundId) {
            setCurrentRoundId(newRoundId);
            timer.reset(timerDuration);
            if (timerDuration > 0 && !autoCreateForTutorial) {
              requestAnimationFrame(() => timer.start());
            }
          } else if (!autoCreateForTutorial) {
            setShowRoundSelector(true);
          }
        }
      }
    } catch (error: any) {
      // Ignore abort errors
      if (error.name === 'AbortError') {
        console.log('[useRoundManagement] Request aborted');
        return;
      }

      console.error('Error loading rounds:', error);

      // Only create round if not aborted and not already creating
      if (!isCreatingRoundRef.current) {
        const autoName = generateRoundName();
        const newRoundId = await createNewRound(autoName, datasetName);
        if (newRoundId) {
          setCurrentRoundId(newRoundId);
          timer.reset(timerDuration);
          if (timerDuration > 0 && !autoCreateForTutorial) {
            requestAnimationFrame(() => timer.start());
          }
        } else if (!autoCreateForTutorial) {
          setShowRoundSelector(true);
        }
      }
    } finally {
      loadRoundsAbortControllerRef.current = null;
      setIsLoadingRounds(false);
    }
  }, [session?.user?.id, createNewRound, gameState, timer, timerDuration, generateRoundName, loadRoundMatches]);

  const handleNewRound = useCallback(() => {
    if (!selectedFolder) return;
    setRoundNameInput('');
    setShowRoundSelector(true);
  }, [selectedFolder]);

  const handleConfirmNewRound = useCallback(async () => {
    if (!selectedFolder) return;
    const name = roundNameInput.trim() || generateRoundName();
    const roundId = await createNewRound(name);
    gameState.resetGame();
    timer.reset(timerDuration);
    setRoundNameInput('');
    setShowRoundSelector(false);
    if (roundId) {
      setCurrentRoundId(roundId);
    }
  }, [selectedFolder, roundNameInput, generateRoundName, createNewRound, gameState, timer, timerDuration]);

  const handleSelectRound = useCallback(async (roundId: string, datasetName?: string) => {
    if (datasetName && datasetName !== selectedFolder) {
      gameState.resetGame();
      timer.reset(timerDuration);
      setCurrentRoundId(null);
      pendingRoundRef.current = { roundId, datasetName };
      return;
    }
    
    setCurrentRoundId(roundId);
    setShowRoundSelector(false);
    pendingRoundRef.current = null;
    gameState.resetGame();
    timer.reset(timerDuration);
    
    const matches = await loadRoundMatches(roundId);
    if (matches.length > 0) {
      gameState.initializeFromMatches(matches);
    }
  }, [gameState, timer, timerDuration, selectedFolder, loadRoundMatches]);

  const handleRoundSelectorSelect = useCallback(
    (roundId: string, datasetName: string) => {
      setShowRoundSelector(false);
      setRoundNameInput('');
      handleSelectRound(roundId, datasetName);
    },
    [handleSelectRound]
  );

  const handleRoundSelectorCancel = useCallback(() => {
    setShowRoundSelector(false);
    setRoundNameInput('');
  }, []);

  const handleRoundNameChange = useCallback((value: string) => {
    setRoundNameInput(value);
  }, []);

  const handleGenerateRoundName = useCallback(() => {
    return generateRoundName();
  }, [generateRoundName]);

  // Load rounds when folder changes
  useEffect(() => {
    if (
      selectedFolder &&
      session?.user?.id &&
      !isLoadingRounds &&
      (lastLoadedRef.current.folder !== selectedFolder || lastLoadedRef.current.userId !== session.user.id)
    ) {
      setRoundsLoaded(false); // Reset rounds loaded flag when folder changes
      loadRecentRounds(selectedFolder);
      lastLoadedRef.current = { folder: selectedFolder, userId: session.user.id };
    }
  }, [selectedFolder, session?.user?.id, loadRecentRounds, isLoadingRounds]);

  const loadPendingRoundIfReady = useCallback((flashcardsReady: boolean, currentSelectedFolder: string | null) => {
    const pendingRound = pendingRoundRef.current;
    if (pendingRound && flashcardsReady && currentSelectedFolder === pendingRound.datasetName) {
      handleSelectRound(pendingRound.roundId, pendingRound.datasetName);
    }
  }, [handleSelectRound]);

  return {
    currentRoundId,
    isCreatingRound,
    isLoadingRounds,
    availableRounds,
    roundsLoaded,
    showRoundSelector,
    roundNameInput,
    setShowRoundSelector,
    setRoundNameInput,
    createNewRound,
    loadRecentRounds,
    loadRoundMatches,
    handleNewRound,
    handleConfirmNewRound,
    handleSelectRound,
    handleRoundSelectorSelect,
    handleRoundSelectorCancel,
    handleRoundNameChange,
    handleGenerateRoundName,
    generateRoundName,
    loadPendingRoundIfReady,
  };
}

