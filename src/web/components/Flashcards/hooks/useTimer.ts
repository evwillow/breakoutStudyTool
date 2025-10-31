/**
 * Timer Hook
 * Consolidated timer logic with proper cleanup and Page Visibility API support
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { TIMER_CONFIG } from '../constants';

export interface UseTimerOptions {
  initialDuration?: number;
  onTimeUp?: () => void;
  autoStart?: boolean;
}

export interface UseTimerReturn {
  timer: number;
  isRunning: boolean;
  isPaused: boolean;
  isReady: boolean;
  displayValue: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: (duration?: number) => void;
  setDuration: (duration: number) => void;
}

export function useTimer({
  initialDuration = TIMER_CONFIG.INITIAL_DURATION,
  onTimeUp,
  autoStart = false,
}: UseTimerOptions = {}): UseTimerReturn {
  const [timer, setTimer] = useState(initialDuration);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isPaused, setIsPaused] = useState(false);
  const [isReady, setIsReady] = useState(true);
  
  // Refs for precise timing
  const timerEndTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const displayValueRef = useRef<number>(initialDuration);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    timerEndTimeRef.current = null;
  }, []);

  // Update timer based on current time
  const updateTimer = useCallback(() => {
    if (!timerEndTimeRef.current) return false;

    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((timerEndTimeRef.current - now) / 1000));
    
    if (remaining <= 0) {
      setTimer(0);
      displayValueRef.current = 0;
      setIsRunning(false);
      setIsReady(true);
      cleanup();
      onTimeUp?.();
      return false;
    }
    
    setTimer(remaining);
    displayValueRef.current = remaining;
    setIsReady(true);
    return true;
  }, [onTimeUp, cleanup]);

  // Animation frame loop for smooth updates
  const tick = useCallback(() => {
    const now = Date.now();
    
    // Update at most once per second to avoid unnecessary renders
    if (now - lastUpdateTimeRef.current >= TIMER_CONFIG.UPDATE_INTERVAL) {
      lastUpdateTimeRef.current = now;
      const shouldContinue = updateTimer();
      if (!shouldContinue) return;
    }
    
    animationFrameRef.current = requestAnimationFrame(tick);
  }, [updateTimer]);

  // Handle visibility change for background timer accuracy
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible' && isRunning && !isPaused) {
      const now = Date.now();
      
      if (timerEndTimeRef.current) {
        const remaining = Math.max(0, Math.ceil((timerEndTimeRef.current - now) / 1000));
        
        displayValueRef.current = remaining;
        setTimer(remaining);
        
        if (remaining <= 0) {
          setIsRunning(false);
          setIsReady(true);
          cleanup();
          onTimeUp?.();
        } else {
          lastUpdateTimeRef.current = now;
          tick();
        }
      }
    }
  }, [isRunning, isPaused, onTimeUp, cleanup, tick]);

  // Start timer
  const start = useCallback(() => {
    // Use current timer state, but if it's 0, use initial duration
    const durationToUse = timer > 0 ? timer : initialDuration;
    
    if (durationToUse <= 0) {
      console.warn('Timer start called with invalid duration:', durationToUse);
      return;
    }
    
    cleanup();
    setIsRunning(true);
    setIsPaused(false);
    setIsReady(false);
    
    // Update timer state if we're using initial duration
    if (timer <= 0) {
      setTimer(initialDuration);
      displayValueRef.current = initialDuration;
    }
    
    timerEndTimeRef.current = Date.now() + durationToUse * 1000;
    lastUpdateTimeRef.current = Date.now();
    tick();
  }, [timer, initialDuration, cleanup, tick]);

  // Pause timer
  const pause = useCallback(() => {
    // Save remaining time before pausing
    if (timerEndTimeRef.current && isRunning && !isPaused) {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((timerEndTimeRef.current - now) / 1000));
      setTimer(remaining);
      displayValueRef.current = remaining;
    }
    setIsPaused(true);
    setIsRunning(false);
    cleanup();
  }, [isRunning, isPaused, cleanup]);

  // Resume timer
  const resume = useCallback(() => {
    // Use current timer value, fallback to initial duration if 0
    const durationToUse = timer > 0 ? timer : initialDuration;
    
    if (durationToUse <= 0) {
      console.warn('Timer resume called with invalid duration:', durationToUse);
      return;
    }
    
    // Update timer state if needed
    if (timer <= 0) {
      setTimer(initialDuration);
      displayValueRef.current = initialDuration;
    }
    
    setIsPaused(false);
    setIsRunning(true);
    setIsReady(false);
    
    timerEndTimeRef.current = Date.now() + durationToUse * 1000;
    lastUpdateTimeRef.current = Date.now();
    tick();
  }, [timer, initialDuration, tick]);

  // Reset timer
  const reset = useCallback((duration?: number) => {
    const newDuration = duration ?? initialDuration;
    cleanup();
    setTimer(newDuration);
    displayValueRef.current = newDuration;
    setIsRunning(false);
    setIsPaused(false);
    setIsReady(true);
  }, [initialDuration, cleanup]);

  // Set new duration
  const setDuration = useCallback((duration: number) => {
    const wasRunning = isRunning;
    cleanup();
    setTimer(duration);
    displayValueRef.current = duration;
    setIsReady(true);
    
    if (wasRunning && !isPaused) {
      // Restart with new duration
      setTimeout(() => {
        timerEndTimeRef.current = Date.now() + duration * 1000;
        lastUpdateTimeRef.current = Date.now();
        tick();
      }, 0);
    }
  }, [isRunning, isPaused, cleanup, tick]);

  // Main timer effect
  useEffect(() => {
    if (isRunning && !isPaused) {
      // Set up visibility change listener
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        cleanup();
      };
    } else {
      cleanup();
    }
  }, [isRunning, isPaused, handleVisibilityChange, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Sync displayValue with timer state to ensure UI updates
  useEffect(() => {
    if (!isRunning && !isPaused) {
      displayValueRef.current = timer;
    }
  }, [timer, isRunning, isPaused]);

  return {
    timer,
    isRunning,
    isPaused,
    isReady,
    displayValue: timer, // Use timer state directly for reliable updates
    start,
    pause,
    resume,
    reset,
    setDuration,
  };
} 