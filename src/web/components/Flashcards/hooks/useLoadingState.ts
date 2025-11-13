"use client";

import { useCallback, useState } from "react";

export const useLoadingState = () => {
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  return {
    loading,
    loadingProgress,
    loadingStep,
    error,
    setLoading,
    setLoadingProgress,
    setLoadingStep,
    setError,
    clearError
  };
};

