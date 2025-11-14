/**
 * @fileoverview Hook for managing round history data fetching and state.
 * @module src/web/components/Features/hooks/useRoundHistory.ts
 * @dependencies React
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Round } from "../RoundHistory.types";

interface UseRoundHistoryProps {
  userId: string | null | undefined;
  isOpen: boolean;
  onRefresh?: ((fetchRounds: () => Promise<void>) => void) | null;
}

interface UseRoundHistoryReturn {
  rounds: Round[];
  loading: boolean;
  error: string | null;
  isDeleting: boolean;
  deletingId: string | null;
  isDeletingAll: boolean;
  retryCount: number;
  fetchRounds: () => Promise<void>;
  handleDeleteRound: (roundId: string) => Promise<void>;
  handleDeleteAllRounds: () => Promise<void>;
  handleRetry: () => void;
  setRounds: React.Dispatch<React.SetStateAction<Round[]>>;
  setIsDeleting: React.Dispatch<React.SetStateAction<boolean>>;
  setDeletingId: React.Dispatch<React.SetStateAction<string | null>>;
  setIsDeletingAll: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * useRoundHistory Hook
 * 
 * Manages round history data fetching, state, and operations:
 * - Fetches rounds from API
 * - Handles loading and error states
 * - Provides delete operations (single and bulk)
 * - Exposes refresh functionality to parent
 */
export const useRoundHistory = ({
  userId,
  isOpen,
  onRefresh,
}: UseRoundHistoryProps): UseRoundHistoryReturn => {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const fetchRounds = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      if (!userId) {
        setError("User ID not found. Please try logging in again.");
        setLoading(false);
        return;
      }

      // Ensure user ID is properly encoded
      const encodedUserId = encodeURIComponent(userId);
      const url = `/api/game/rounds?userId=${encodedUserId}`;
      
      // HTTP cache headers are set on the API route for fast loads
      const fetchResponse = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        keepalive: true
      });
      
      if (!fetchResponse.ok) {
        const data = await fetchResponse.json();
        const message =
          data?.error?.message ||
          data?.error ||
          data?.message ||
          `Unexpected response (${fetchResponse.status})`;
        throw new Error(message || "Failed to fetch rounds");
      }
      
      const data = await fetchResponse.json();
      
      if (data.data && Array.isArray(data.data)) {
        // Validate that all rounds belong to the current user
        const validRounds = data.data.filter((round: Round) => {
          return round.user_id === userId;
        });
        setRounds(validRounds);
      } else {
        setRounds([]);
      }
    } catch (error) {
      console.error("Error fetching rounds:", error);
      setError(error instanceof Error ? error.message : "Failed to load rounds. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Expose refresh function to parent
  useEffect(() => {
    if (onRefresh) {
      onRefresh(fetchRounds);
    }
  }, [onRefresh, fetchRounds]);

  useEffect(() => {
    if (isOpen) {
      console.log('RoundHistory: Modal opened, fetching fresh data...');
      console.log('Modal open time:', new Date().toISOString());
      fetchRounds();
    }
  }, [isOpen, userId, fetchRounds]);

  const handleDeleteRound = useCallback(async (roundId: string): Promise<void> => {
    if (confirm("Are you sure you want to delete this round?")) {
      setIsDeleting(true);
      setDeletingId(roundId);
      try {
        const response = await fetch(`/api/game/rounds/${roundId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error?.message || "Failed to delete round");
        }
        
        // Refresh the list after deletion
        setRounds(prevRounds => prevRounds.filter(r => r.id !== roundId));
      } catch (err) {
        console.error("Error deleting round:", err);
        alert("Failed to delete round: " + (err instanceof Error ? err.message : "Unknown error"));
      } finally {
        setIsDeleting(false);
        setDeletingId(null);
      }
    }
  }, []);

  const handleDeleteAllRounds = useCallback(async (): Promise<void> => {
    // Use browser confirm dialog instead of nested popup
    if (!confirm("Are you sure you want to delete all of your rounds? This action cannot be undone.")) {
      return;
    }

    setIsDeletingAll(true);
    try {
      const response = await fetch(`/api/game/rounds/bulk?userId=${userId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to delete rounds");
      }
      
      // Clear the rounds list
      setRounds([]);
      console.log("All rounds deleted successfully");
    } catch (err) {
      console.error("Error deleting all rounds:", err);
      alert("Failed to delete all rounds: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setIsDeletingAll(false);
    }
  }, [userId]);

  const handleRetry = useCallback((): void => {
    setError(null);
    setLoading(true);
    setRetryCount(prevCount => prevCount + 1);
  }, []);

  return {
    rounds,
    loading,
    error,
    isDeleting,
    deletingId,
    isDeletingAll,
    retryCount,
    fetchRounds,
    handleDeleteRound,
    handleDeleteAllRounds,
    handleRetry,
    setRounds,
    setIsDeleting,
    setDeletingId,
    setIsDeletingAll,
  };
};

