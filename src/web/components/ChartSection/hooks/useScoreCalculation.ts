/**
 * @fileoverview Hook for managing animation state and pause handling for score display.
 * @module src/web/components/ChartSection/hooks/useScoreCalculation.ts
 * @dependencies React
 */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface UseScoreCalculationOptions {
  feedback: unknown;
  afterData: unknown;
  isMobile: boolean;
  onAfterEffectComplete?: (() => void) | null;
  onTimerPause?: (() => void) | null;
}

export interface UseScoreCalculationReturn {
  showAfterAnimation: boolean;
  progressPercentage: number;
  zoomPercentage: number;
  completionDelay: boolean;
  afterAnimationComplete: boolean;
  animationInProgress: boolean;
  isAnimationPaused: boolean;
  handlePauseChange: (paused: boolean) => void;
}

export function useScoreCalculation({
  feedback,
  afterData,
  isMobile,
  onAfterEffectComplete,
  onTimerPause,
}: UseScoreCalculationOptions): UseScoreCalculationReturn {
  const [showAfterAnimation, setShowAfterAnimation] = useState<boolean>(false);
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [zoomPercentage, setZoomPercentage] = useState<number>(0);
  const [completionDelay, setCompletionDelay] = useState<boolean>(false);
  const [afterAnimationComplete, setAfterAnimationComplete] = useState<boolean>(false);
  const [animationInProgress, setAnimationInProgress] = useState<boolean>(false);
  
  const isAnimationPausedRef = useRef<boolean>(false);
  const animationPauseRef = useRef<number | null>(null);
  const delayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const delayStartTimeRef = useRef<number | null>(null);
  const debugIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFeedbackRef = useRef<string | null>(null);
  const shouldStopAnimationRef = useRef<boolean>(false);

  const handlePauseChange = useCallback((paused: boolean): void => {
    isAnimationPausedRef.current = paused;
  }, []);

  // Pause timer when animation is in progress
  useEffect(() => {
    if (animationInProgress && onTimerPause) {
      onTimerPause();
    }
  }, [animationInProgress, onTimerPause]);

  // Handle zoom animation and data reveal
  useEffect(() => {
    // Logging removed for cleaner console

    if (!feedback) {
      if (lastFeedbackRef.current !== null) {
        lastFeedbackRef.current = null;
        setAnimationInProgress(false);
        setShowAfterAnimation(false);
        setProgressPercentage(0);
        setZoomPercentage(0);
        setCompletionDelay(false);
        setAfterAnimationComplete(false);
        shouldStopAnimationRef.current = true;
      }
      return;
    }

    const animationKey = `${feedback}-${!!afterData}`;
    if (lastFeedbackRef.current === animationKey) {
      return;
    }
    lastFeedbackRef.current = animationKey;
    
    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
    if (debugIntervalRef.current) {
      clearInterval(debugIntervalRef.current);
      debugIntervalRef.current = null;
    }

    if (animationInProgress) {
      return;
    }

    setAnimationInProgress(true);
    
    const animate = async () => {
      try {
        // Initial 1.5-second delay
        await new Promise<void>(resolve => {
          let remainingDelay = 1500;
          let pausedTime = 0;
          let pauseStartTime: number | null = null;
          const delayStartTime = performance.now();
          
          const checkInitialDelay = (): void => {
            if (shouldStopAnimationRef.current || !feedback) {
              setAnimationInProgress(false);
              setShowAfterAnimation(false);
              setProgressPercentage(0);
              setZoomPercentage(0);
              setCompletionDelay(false);
              setAfterAnimationComplete(false);
              resolve();
              return;
            }
            
            const now = performance.now();
            const isPaused = isAnimationPausedRef.current;
            
            if (isPaused) {
              if (pauseStartTime === null) {
                pauseStartTime = now;
              }
              requestAnimationFrame(checkInitialDelay);
              return;
            }
            
            if (pauseStartTime !== null) {
              pausedTime += now - pauseStartTime;
              pauseStartTime = null;
            }
            
            const elapsed = (now - delayStartTime) - pausedTime;
            
            if (elapsed >= remainingDelay) {
              resolve();
            } else {
              requestAnimationFrame(checkInitialDelay);
            }
          };
          
          requestAnimationFrame(checkInitialDelay);
        });
        
        if (afterData && Array.isArray(afterData) && afterData.length > 0) {
          // Zoom animation
          await new Promise<void>(resolve => {
            let startTime = performance.now();
            const zoomDuration = 1500;
            let pausedTime = 0;
            let pauseStartTime: number | null = null;
            
            const animateZoom = (timestamp: number): void => {
              if (shouldStopAnimationRef.current || !feedback) {
                setAnimationInProgress(false);
                setShowAfterAnimation(false);
                setProgressPercentage(0);
                setZoomPercentage(0);
                setCompletionDelay(false);
                setAfterAnimationComplete(false);
                if (animationPauseRef.current) {
                  cancelAnimationFrame(animationPauseRef.current);
                  animationPauseRef.current = null;
                }
                resolve();
                return;
              }
              
              const isPaused = isAnimationPausedRef.current;
              
              if (isPaused) {
                if (pauseStartTime === null) {
                  pauseStartTime = timestamp;
                }
                animationPauseRef.current = requestAnimationFrame(animateZoom);
                return;
              }
              
              if (pauseStartTime !== null) {
                pausedTime += timestamp - pauseStartTime;
                pauseStartTime = null;
              }
              
              const elapsed = timestamp - startTime - pausedTime;
              const progress = Math.min(elapsed / zoomDuration, 1);
              const easedProgress = 1 - Math.pow(1 - progress, 3);
              
              setZoomPercentage(easedProgress * 100);
              
              if (progress < 1) {
                animationPauseRef.current = requestAnimationFrame(animateZoom);
              } else {
                setZoomPercentage(100);
                animationPauseRef.current = null;
                resolve();
              }
            };
            
            animationPauseRef.current = requestAnimationFrame(animateZoom);
          });
          
          if (shouldStopAnimationRef.current || !feedback) {
            setAnimationInProgress(false);
            setShowAfterAnimation(false);
            setProgressPercentage(0);
            setZoomPercentage(0);
            setCompletionDelay(false);
            setAfterAnimationComplete(false);
            return;
          }
          
          // Reveal animation
          setShowAfterAnimation(true);
          if (onTimerPause) {
            onTimerPause();
          }
          await new Promise<void>(resolve => {
            let startTime = performance.now();
            const revealDuration = 1800;
            let pausedTime = 0;
            let pauseStartTime: number | null = null;
            
            const animateReveal = (timestamp: number): void => {
              if (shouldStopAnimationRef.current || !feedback) {
                setAnimationInProgress(false);
                setShowAfterAnimation(false);
                setProgressPercentage(0);
                setZoomPercentage(0);
                setCompletionDelay(false);
                setAfterAnimationComplete(false);
                if (animationPauseRef.current) {
                  cancelAnimationFrame(animationPauseRef.current);
                  animationPauseRef.current = null;
                }
                resolve();
                return;
              }
              
              const isPaused = isAnimationPausedRef.current;
              
              if (isPaused) {
                if (pauseStartTime === null) {
                  pauseStartTime = timestamp;
                }
                animationPauseRef.current = requestAnimationFrame(animateReveal);
                return;
              }
              
              if (pauseStartTime !== null) {
                pausedTime += timestamp - pauseStartTime;
                pauseStartTime = null;
              }
              
              const elapsed = timestamp - startTime - pausedTime;
              const progress = Math.min(elapsed / revealDuration, 1);
              const easedProgress = 1 - Math.pow(1 - progress, 3);
              
              setProgressPercentage(easedProgress * 100);
              
              if (progress < 1) {
                animationPauseRef.current = requestAnimationFrame(animateReveal);
              } else {
                setProgressPercentage(100);
                setAfterAnimationComplete(true);
                // Dispatch tutorial event immediately when animation completes
                window.dispatchEvent(new CustomEvent('tutorial-after-animation-complete'));
                animationPauseRef.current = null;
                resolve();
              }
            };

            animationPauseRef.current = requestAnimationFrame(animateReveal);
          });
        } else {
          setShowAfterAnimation(false);
          setProgressPercentage(0);
          setZoomPercentage(0);
          await new Promise(resolve => setTimeout(resolve, 500));
          setAfterAnimationComplete(true);
          // Dispatch tutorial event for no-animation case as well
          window.dispatchEvent(new CustomEvent('tutorial-after-animation-complete'));
        }

        if (afterData && Array.isArray(afterData) && afterData.length > 0) {
          setProgressPercentage(100);
          setAfterAnimationComplete(true);
          // Already dispatched above
        }
        
        await new Promise<void>(resolve => {
          requestAnimationFrame(() => {
            setTimeout(() => {
              resolve();
            }, 100);
          });
        });
        
        setCompletionDelay(true);
        
        if (delayTimerRef.current) {
          clearTimeout(delayTimerRef.current);
          delayTimerRef.current = null;
        }
        if (debugIntervalRef.current) {
          clearInterval(debugIntervalRef.current);
          debugIntervalRef.current = null;
        }
        
        delayStartTimeRef.current = Date.now();
        
        debugIntervalRef.current = setInterval(() => {
          if (!delayStartTimeRef.current) return;
          const elapsed = (Date.now() - delayStartTimeRef.current) / 1000;
          // Logging removed
        }, 1000);
        
        await new Promise<void>(resolve => {
          let remainingDelay = 5000;
          let pausedTime = 0;
          let pauseStartTime: number | null = null;
          
          const checkDelay = (): void => {
            if (shouldStopAnimationRef.current || !feedback) {
              setAnimationInProgress(false);
              setShowAfterAnimation(false);
              setProgressPercentage(0);
              setZoomPercentage(0);
              setCompletionDelay(false);
              setAfterAnimationComplete(false);
              if (delayTimerRef.current) {
                clearTimeout(delayTimerRef.current);
                delayTimerRef.current = null;
              }
              if (debugIntervalRef.current) {
                clearInterval(debugIntervalRef.current);
                debugIntervalRef.current = null;
              }
              resolve();
              return;
            }
            
            const isPaused = isAnimationPausedRef.current;
            
            if (isPaused) {
              if (pauseStartTime === null) {
                pauseStartTime = Date.now();
              }
              delayTimerRef.current = setTimeout(checkDelay, 100);
              return;
            }
            
            if (pauseStartTime !== null) {
              pausedTime += Date.now() - pauseStartTime;
              pauseStartTime = null;
            }
            
            if (!delayStartTimeRef.current) return;
            const elapsed = (Date.now() - delayStartTimeRef.current) - pausedTime;
            
            if (elapsed >= remainingDelay) {
              if (debugIntervalRef.current) {
                clearInterval(debugIntervalRef.current);
                debugIntervalRef.current = null;
              }
              
              setCompletionDelay(false);
              
              if (isMobile) {
                const dChartElement = document.querySelector('.bg-gradient-turquoise');
                if (dChartElement) {
                  const chartContainer = dChartElement.closest('.rounded-md') || dChartElement;
                  const rect = chartContainer.getBoundingClientRect();
                  window.scrollTo({
                    top: window.pageYOffset + rect.top - 100,
                    behavior: 'smooth'
                  });
                } else {
                  window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                  });
                }
              }
              
              if (onAfterEffectComplete) {
                onAfterEffectComplete();
              }
              
              setAnimationInProgress(false);
              resolve();
            } else {
              delayTimerRef.current = setTimeout(checkDelay, 100);
            }
          };
          
          delayTimerRef.current = setTimeout(checkDelay, 100);
        });
      } catch (error) {
        console.error("Animation sequence error:", error);
        setAnimationInProgress(false);
      }
    };
    
    animate();
    
    return () => {
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }
      if (debugIntervalRef.current) {
        clearInterval(debugIntervalRef.current);
        debugIntervalRef.current = null;
      }
      setAnimationInProgress(false);
    };
  }, [afterData, feedback, isMobile, onAfterEffectComplete, onTimerPause, animationInProgress]);

  // Reset feedback tracking when moving to a new card
  useEffect(() => {
    if (!feedback) {
      lastFeedbackRef.current = null;
      setAnimationInProgress(false);
      setShowAfterAnimation(false);
      setProgressPercentage(0);
      setZoomPercentage(0);
      setCompletionDelay(false);
      setAfterAnimationComplete(false);
      isAnimationPausedRef.current = false;
      shouldStopAnimationRef.current = true;
      
      if (animationPauseRef.current) {
        cancelAnimationFrame(animationPauseRef.current);
        animationPauseRef.current = null;
      }
      
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }
      if (debugIntervalRef.current) {
        clearInterval(debugIntervalRef.current);
        debugIntervalRef.current = null;
      }
    }
  }, [feedback]);

  // Handle feedback being cleared
  useEffect(() => {
    if (!feedback) {
      if (lastFeedbackRef.current !== null || animationInProgress || showAfterAnimation) {
        shouldStopAnimationRef.current = true;
        setAnimationInProgress(false);
        setShowAfterAnimation(false);
        setProgressPercentage(0);
        setZoomPercentage(0);
        setCompletionDelay(false);
        setAfterAnimationComplete(false);
        lastFeedbackRef.current = null;
        isAnimationPausedRef.current = false;
        
        if (animationPauseRef.current) {
          cancelAnimationFrame(animationPauseRef.current);
          animationPauseRef.current = null;
        }
        
        if (delayTimerRef.current) {
          clearTimeout(delayTimerRef.current);
          delayTimerRef.current = null;
        }
        if (debugIntervalRef.current) {
          clearInterval(debugIntervalRef.current);
          debugIntervalRef.current = null;
        }
      }
    } else if (feedback) {
      shouldStopAnimationRef.current = false;
    }
  }, [feedback, animationInProgress, showAfterAnimation]);

  return {
    showAfterAnimation,
    progressPercentage,
    zoomPercentage,
    completionDelay,
    afterAnimationComplete,
    animationInProgress,
    isAnimationPaused: isAnimationPausedRef.current,
    handlePauseChange,
  };
}

