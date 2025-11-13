/**
 * @fileoverview Hook for logging matches to the database.
 * @module src/web/components/Flashcards/hooks/useMatchLogging.ts
 */
"use client";

import { useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { extractStockName } from "../utils/dataProcessors";
import type { FlashcardData } from "../utils/dataProcessors";

export interface UseMatchLoggingReturn {
  logMatchWithCoordinates: (data: {
    coordinates: { x: number; y: number };
    targetPoint: { x: number; y: number };
    distance: number;
    score: number;
    stockSymbol: string;
    isCorrect: boolean;
    priceAccuracy?: number;
    timePosition?: number;
    priceError?: number;
    timeError?: number;
  }) => Promise<void>;
  logMatch: (buttonIndex: number, isCorrect: boolean, flashcard: FlashcardData | null) => Promise<void>;
  triggerRoundHistoryRefresh: () => void;
  setRoundHistoryRefresh: (fn: (() => void) | null) => void;
  roundHistoryRefresh: (() => void) | null;
}

export function useMatchLogging(
  currentRoundId: string | null
): UseMatchLoggingReturn {
  const { data: session } = useSession();
  const [roundHistoryRefresh, setRoundHistoryRefresh] = useState<(() => void) | null>(null);
  const [lastMatchLogTime, setLastMatchLogTime] = useState<number>(0);
  const [matchLogCount, setMatchLogCount] = useState<number>(0);
  const [refreshCount, setRefreshCount] = useState<number>(0);

  const triggerRoundHistoryRefresh = useCallback(() => {
    const currentRefreshCount = refreshCount + 1;
    setRefreshCount(currentRefreshCount);
    const refreshFn = roundHistoryRefresh;
    if (refreshFn && typeof refreshFn === 'function') {
      const delay = 1000 + Math.random() * 500;
      setTimeout(() => {
        if (refreshFn && typeof refreshFn === 'function') {
          refreshFn();
        }
      }, delay);
    }
  }, [roundHistoryRefresh, refreshCount]);

  const logMatchWithCoordinates = useCallback(async (data: {
    coordinates: { x: number; y: number };
    targetPoint: { x: number; y: number };
    distance: number;
    score: number;
    stockSymbol: string;
    isCorrect: boolean;
    priceAccuracy?: number;
    timePosition?: number;
    priceError?: number;
    timeError?: number;
  }) => {
    if (!currentRoundId || !session?.user?.id) return;

    const matchData: any = {
      round_id: currentRoundId,
      stock_symbol: data.stockSymbol,
      correct: Boolean(data.isCorrect),
    };
    
    if (typeof data.coordinates.x === 'number' && !isNaN(data.coordinates.x)) {
      matchData.user_selection_x = data.coordinates.x;
    }
    if (typeof data.coordinates.y === 'number' && !isNaN(data.coordinates.y)) {
      matchData.user_selection_y = data.coordinates.y;
    }
    if (typeof data.targetPoint.x === 'number' && !isNaN(data.targetPoint.x)) {
      matchData.target_x = data.targetPoint.x;
    }
    if (typeof data.targetPoint.y === 'number' && !isNaN(data.targetPoint.y)) {
      matchData.target_y = data.targetPoint.y;
    }
    if (typeof data.distance === 'number' && !isNaN(data.distance)) {
      matchData.distance = data.distance;
    }
    if (typeof data.score === 'number' && !isNaN(data.score)) {
      matchData.score = data.score;
    }
    if (data.priceAccuracy !== undefined && !isNaN(data.priceAccuracy)) {
      matchData.price_accuracy = data.priceAccuracy;
    }
    if (data.timePosition !== undefined && !isNaN(data.timePosition)) {
      matchData.time_position = data.timePosition;
    }
    if (data.priceError !== undefined && !isNaN(data.priceError)) {
      matchData.price_error = data.priceError;
    }
    if (data.timeError !== undefined && !isNaN(data.timeError)) {
      matchData.time_error = data.timeError;
    }

    try {
      const response = await fetch('/api/game/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchData),
      });

      if (response.ok) {
        setLastMatchLogTime(Date.now());
        setMatchLogCount(prev => prev + 1);
        triggerRoundHistoryRefresh();
      }
    } catch (error) {
      console.error('Error logging match:', error);
    }
  }, [currentRoundId, session?.user?.id, triggerRoundHistoryRefresh]);

  const logMatch = useCallback(async (buttonIndex: number, isCorrect: boolean, flashcard: FlashcardData | null) => {
    if (!currentRoundId || !flashcard || !session?.user?.id) return;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(currentRoundId)) return;

    const stockSymbol = extractStockName(flashcard) || 'UNKNOWN';
    const matchData = {
      round_id: currentRoundId,
      stock_symbol: stockSymbol,
      user_selection: buttonIndex,
      correct: isCorrect,
    };

    try {
      const response = await fetch('/api/game/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchData),
      });

      if (response.ok) {
        setLastMatchLogTime(Date.now());
        setMatchLogCount(prev => prev + 1);
        triggerRoundHistoryRefresh();
      }
    } catch (error) {
      console.error('Error logging match:', error);
    }
  }, [currentRoundId, session?.user?.id, triggerRoundHistoryRefresh]);

  return {
    logMatchWithCoordinates,
    logMatch,
    triggerRoundHistoryRefresh,
    setRoundHistoryRefresh,
    roundHistoryRefresh,
  };
}

