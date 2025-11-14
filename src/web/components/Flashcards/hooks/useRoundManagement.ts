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

    setIsCreatingRound(true);
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
      return result.data?.id || null;
    } catch (error) {
      console.error('Error creating round:', error);
      return null;
    } finally {
      setIsCreatingRound(false);
    }
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

  const loadRecentRounds = useCallback(async (datasetName: string, autoCreateForTutorial = false): Promise<void> => {
    if (!session?.user?.id || !datasetName) return;

    const userId = session.user.id;
    const cacheKey = `${userId}_${datasetName}`;

    if (!window.__roundCache) {
      window.__roundCache = {};
    }
    const roundCache = window.__roundCache;

    if (!autoCreateForTutorial && roundCache[cacheKey]) {
      const cached = roundCache[cacheKey];
      const cacheAge = Date.now() - cached.fetchedAt;
      if (cacheAge < 30000) {
        setAvailableRounds(cached.rounds || []);
        setRoundsLoaded(true); // Mark that rounds have been loaded (from cache)
        const mostRecent = cached.rounds?.find((r: any) => !r.completed) || cached.rounds?.[0];
        if (mostRecent && !pendingRoundRef.current) {
          setCurrentRoundId(mostRecent.id);
        }
        setIsLoadingRounds(false);
        return;
      }
    }

    setIsLoadingRounds(true);
    try {
      const url = `/api/game/rounds?userId=${encodeURIComponent(userId)}&datasetName=${encodeURIComponent(datasetName)}&limit=5`;
      const response = await fetch(url, { 
        method: 'GET', 
        headers: { 
          'Accept': 'application/json',
        },
        keepalive: true,
      });
      const result = await response.json();

      if (!response.ok) {
        const autoName = generateRoundName();
        const newRoundId = await createNewRound(autoName, datasetName);
        if (newRoundId) setCurrentRoundId(newRoundId);
        return;
      }

      const rounds = result.data || [];
      const validRounds = rounds.filter((r: any) => r.user_id === userId);
      setAvailableRounds(validRounds);
      setRoundsLoaded(true); // Mark that rounds have been loaded
      roundCache[cacheKey] = { rounds: validRounds, fetchedAt: Date.now() };

      if (pendingRoundRef.current) return;

      const mostRecentIncomplete = rounds.find((r: any) => !r.completed);
      if (mostRecentIncomplete && !autoCreateForTutorial) {
        setCurrentRoundId(mostRecentIncomplete.id);
        const matches = await loadRoundMatches(mostRecentIncomplete.id);
        if (matches.length > 0) {
          if (!window.__matchCache) window.__matchCache = {};
          window.__matchCache[mostRecentIncomplete.id] = { matches, fetchedAt: Date.now() };
          gameState.initializeFromMatches(matches);
        }
        timer.reset(timerDuration);
        if (timerDuration > 0) {
          requestAnimationFrame(() => timer.start());
        }
      } else if (rounds.length > 0 && !autoCreateForTutorial) {
        setShowRoundSelector(true);
      } else {
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
    } catch (error) {
      console.error('Error loading rounds:', error);
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
    } finally {
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
    if (roundId) {
      setCurrentRoundId(roundId);
      setShowRoundSelector(false);
    } else {
      setShowRoundSelector(false);
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

