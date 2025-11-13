/**
 * Timer Hook
 * Consolidated timer logic with proper cleanup and Page Visibility API support
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { TIMER_CONFIG } from '../constants';
import type { UseTimerOptions, UseTimerReturn } from '@breakout-study-tool/shared';

// Re-export for backward compatibility
export type { UseTimerOptions, UseTimerReturn };

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
    if (!timerEndTimeRef.current) {
      // If timerEndTimeRef is null but we should be running, something went wrong
      // Try to restart if isRunning is true
      if (isRunning && !isPaused) {
        console.warn('Timer end time is null but timer should be running');
      }
      return false;
    }

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
  }, [onTimeUp, cleanup, isRunning, isPaused]);

  // Animation frame loop for smooth updates
  const tick = useCallback(() => {
    const now = Date.now();
    
    // Update at most once per second to avoid unnecessary renders
    if (now - lastUpdateTimeRef.current >= TIMER_CONFIG.UPDATE_INTERVAL) {
      lastUpdateTimeRef.current = now;
      const shouldContinue = updateTimer();
      if (!shouldContinue) {
        // Timer expired or stopped
        return;
      }
    }
    
    // Continue the animation loop - check if we should still be running
    // Use refs to avoid stale closure issues
    if (timerEndTimeRef.current) {
      animationFrameRef.current = requestAnimationFrame(tick);
    }
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
    // Prioritize displayValueRef.current if it's been set (most recent value)
    // This ensures we use the value from reset() even if state hasn't updated yet
    const currentTimerValue = displayValueRef.current > 0 ? displayValueRef.current : (timer > 0 ? timer : initialDuration);
    const durationToUse = currentTimerValue > 0 ? currentTimerValue : initialDuration;
    
    if (durationToUse <= 0) {
      console.warn('Timer start called with invalid duration:', durationToUse);
      return;
    }
    
    cleanup();
    setIsRunning(true);
    setIsPaused(false);
    setIsReady(false);
    
    // Update timer state immediately so UI shows the correct value
    setTimer(durationToUse);
    displayValueRef.current = durationToUse;
    
    timerEndTimeRef.current = Date.now() + durationToUse * 1000;
    // Set lastUpdateTime to 0 so the first tick will immediately update
    lastUpdateTimeRef.current = 0;
    
    // Start the tick loop immediately - this will update after UPDATE_INTERVAL
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

  // Main timer effect - manages visibility listener and ensures timer keeps running
  useEffect(() => {
    if (isRunning && !isPaused) {
      // Set up visibility change listener
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Ensure tick is running if timer should be running
      // This is a safety net in case tick() wasn't called or was stopped
      if (!animationFrameRef.current && timerEndTimeRef.current) {
        // Use requestAnimationFrame to start the loop
        requestAnimationFrame(() => {
          if (!animationFrameRef.current && timerEndTimeRef.current && isRunning && !isPaused) {
            tick();
          }
        });
      }
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        // Don't cleanup animation frame here - let it run until timer stops naturally
      };
    } else {
      // Only cleanup when timer is explicitly stopped
      cleanup();
    }
    // Only depend on isRunning and isPaused to avoid infinite loops
    // The callbacks (handleVisibilityChange, cleanup, tick) are stable due to useCallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, isPaused]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Sync displayValue with timer state to ensure UI updates
  // Only update when timer actually changes and timer is stopped
  useEffect(() => {
    if (!isRunning && !isPaused) {
      displayValueRef.current = timer;
    }
    // Only run when timer value changes, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer]);

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