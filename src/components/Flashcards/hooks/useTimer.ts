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
    if (timer <= 0) return;
    
    cleanup();
    setIsRunning(true);
    setIsPaused(false);
    setIsReady(false);
    
    timerEndTimeRef.current = Date.now() + timer * 1000;
    lastUpdateTimeRef.current = Date.now();
    tick();
  }, [timer, cleanup, tick]);

  // Pause timer
  const pause = useCallback(() => {
    setIsPaused(true);
    setIsRunning(false);
    cleanup();
  }, [cleanup]);

  // Resume timer
  const resume = useCallback(() => {
    if (timer <= 0) return;
    
    setIsPaused(false);
    setIsRunning(true);
    setIsReady(false);
    
    timerEndTimeRef.current = Date.now() + timer * 1000;
    lastUpdateTimeRef.current = Date.now();
    tick();
  }, [timer, tick]);

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

  return {
    timer,
    isRunning,
    isPaused,
    isReady,
    displayValue: displayValueRef.current,
    start,
    pause,
    resume,
    reset,
    setDuration,
  };
} 