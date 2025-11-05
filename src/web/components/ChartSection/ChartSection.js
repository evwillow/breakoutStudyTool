"use client";

/**
 * ChartSection Component
 * 
 * A comprehensive chart section that handles the display of stock charts with animations,
 * authentication modal, and action buttons for trading practice.
 * 
 * Features:
 * - Responsive chart display with mobile optimization
 * - Animated reveal of "after" data with precise timing
 * - Authentication modal integration
 * - Action buttons for user interaction
 * - Clean, borderless design with soft backgrounds for reduced eye strain
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import StockChart from "../StockChart";
import { AuthModal } from "../Auth";
import ChartMagnifier from "../UI/ChartMagnifier";
import { getAccuracyTier } from "../Flashcards/utils/coordinateUtils";

// ChartScoreOverlay component - inlined to fix import issues
const ChartScoreOverlay = ({ score, accuracyTier, show, onNext, isMobile, alwaysPaused = false, onPauseChange = null }) => {
  const [countdown, setCountdown] = useState(10);
  const [isPaused, setIsPaused] = useState(alwaysPaused);
  const intervalRef = useRef(null);
  const isPausedRef = useRef(alwaysPaused);
  const onNextRef = useRef(onNext);
  
  // Keep onNext ref up to date
  useEffect(() => {
    onNextRef.current = onNext;
  }, [onNext]);
  
  // Reset countdown when popup appears
  useEffect(() => {
    if (!show || score === null || score === undefined) {
      return;
    }
    
    setCountdown(10);
    setIsPaused(alwaysPaused);
    isPausedRef.current = alwaysPaused;
    
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [show, score, alwaysPaused]);
  
  // Countdown timer - only runs when not paused and not always paused
  useEffect(() => {
    if (!show || score === null || score === undefined || isPaused || alwaysPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          // Call onNext when countdown reaches 0 (if not paused)
          // Use refs to get current state (avoid stale closure)
          if (!isPausedRef.current && !alwaysPaused && onNextRef.current) {
            console.log("ChartScoreOverlay: Countdown reached 0, calling onNext");
            onNextRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [show, score, isPaused, alwaysPaused]);
  
  // Handle pause toggle
  const handlePauseToggle = () => {
    setIsPaused(prev => {
      const newPaused = !prev;
      isPausedRef.current = newPaused; // Update ref immediately
      console.log("ChartScoreOverlay: Pause button clicked, new state:", newPaused);
      // Clear interval when pausing
      if (newPaused && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Notify parent about pause state change - this is critical for animation pause
      if (onPauseChange) {
        console.log("ChartScoreOverlay: Calling onPauseChange with:", newPaused);
        onPauseChange(newPaused);
      } else {
        console.warn("ChartScoreOverlay: onPauseChange callback is not available!");
      }
      return newPaused;
    });
  };
  
  if (!show || score === null || score === undefined) {
    return null;
  }

  return (
    <div className={`absolute z-50 pointer-events-none ${
      isMobile 
        ? 'bottom-0 left-2 right-2' 
        : 'bottom-0 left-2 right-2'
    }`}>
      <div className={`bg-gradient-to-br from-gray-900 via-black to-gray-900 bg-opacity-98 backdrop-blur-lg border-2 border-turquoise-500/80 rounded-2xl shadow-2xl pointer-events-auto transform transition-all duration-300 animate-slide-in-up relative overflow-hidden w-full flex flex-col ${
        isMobile 
          ? 'px-4 py-3' 
          : 'px-5 py-3'
      }`}>
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-turquoise-500/10 via-transparent to-transparent pointer-events-none"></div>
        
        <div className={`relative z-10 ${isMobile ? 'flex items-center justify-between gap-2' : 'flex items-center justify-between gap-3'}`}>
          {/* Left side: Badge icon and score */}
          <div className={`flex items-center gap-2.5 ${isMobile ? '' : ''}`}>
            <div className={`rounded-lg bg-gradient-to-br from-turquoise-500 to-turquoise-600 flex items-center justify-center shadow-lg ring-2 ring-turquoise-500/30 flex-shrink-0 ${
              isMobile ? 'w-8 h-8' : 'w-10 h-10'
            }`}>
              <svg className={`text-white ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div className="flex flex-col">
              {!isMobile && <p className="text-xs text-gray-400 uppercase tracking-widest mb-0.5">Score</p>}
              <h3 className={`font-bold text-white tracking-tight ${isMobile ? 'text-2xl' : 'text-2xl'}`}>
                {Math.round(score)}%
              </h3>
            </div>
          </div>
          
          {/* Right side: Countdown and buttons in one row on mobile */}
          <div className={`flex items-center gap-2 flex-shrink-0 ${isMobile ? 'flex-1 justify-end' : ''}`}>
            {/* Countdown (when not paused and not always paused) */}
            {!alwaysPaused && !isPaused && (
              <div className="flex items-center gap-1">
                <p className={`text-gray-400 whitespace-nowrap ${isMobile ? 'text-[10px]' : 'text-xs'}`}>{isMobile ? 'Next' : 'Next in'}</p>
                <div className={`flex items-center justify-center rounded-full bg-turquoise-500/20 border border-turquoise-500/40 ${
                  isMobile ? 'w-5 h-5' : 'w-7 h-7'
                }`}>
                  <span className={`font-bold text-turquoise-400 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>{countdown}</span>
                </div>
                <p className={`text-gray-400 whitespace-nowrap ${isMobile ? 'text-[10px]' : 'text-xs'}`}>s</p>
              </div>
            )}
            {/* Pause/Resume button (when not always paused) */}
            {!alwaysPaused && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handlePauseToggle();
                }}
                className={`bg-gray-700/50 hover:bg-gray-700/70 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 border border-gray-600/50 relative z-20 ${
                  isMobile 
                    ? 'px-3 py-1.5 text-xs' 
                    : 'px-2.5 py-1 text-xs whitespace-nowrap'
                }`}
                type="button"
              >
                {isPaused ? 'Resume' : 'Pause'}
              </button>
            )}
            {/* Next Stock button */}
            {onNext && (
              <button
                onClick={onNext}
                className={`bg-gradient-to-r from-turquoise-600 to-turquoise-500 hover:from-turquoise-700 hover:to-turquoise-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 border border-turquoise-400/30 ${
                  isMobile 
                    ? 'px-3 py-1.5 text-xs' 
                    : 'px-3 py-1 text-xs whitespace-nowrap'
                }`}
              >
                Next Stock
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function ChartSection({
  orderedFiles,
  afterData,
  timer,
  pointsTextArray = [],
  actionButtons, // Deprecated - kept for compatibility
  selectedButtonIndex, // Deprecated - kept for compatibility
  feedback,
  onButtonClick, // Deprecated - kept for compatibility
  disabled,
  isTimeUp,
  onAfterEffectComplete,
  // New coordinate-based props
  onChartClick = null,
  userSelection = null, // { x, y, chartX, chartY }
  distance = null,
  score = null,
  targetPoint = null, // Target point for visualization
  onNextCard = null, // Callback to move to next card
  timerDuration = null, // Timer duration to check if always paused (0 = always pause)
  onTimerDurationChange = null, // Callback to change timer duration
  onPauseStateChange = null, // Callback to notify parent of pause state changes
}) {
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [showAfterAnimation, setShowAfterAnimation] = useState(false);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [zoomPercentage, setZoomPercentage] = useState(0);
  const isAnimationPausedRef = useRef(false);
  const animationPauseRef = useRef(null);
  
  // Handle pause state change from overlay
  const handlePauseChange = useCallback((paused) => {
    console.log("Pause state changed:", paused);
    isAnimationPausedRef.current = paused;
    console.log("Animation pause ref updated to:", isAnimationPausedRef.current);
    // Notify parent component about pause state change
    if (onPauseStateChange) {
      onPauseStateChange(paused);
    }
  }, [onPauseStateChange]);
  const [completionDelay, setCompletionDelay] = useState(false);
  const [afterAnimationComplete, setAfterAnimationComplete] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [animationInProgress, setAnimationInProgress] = useState(false);
  const delayTimerRef = useRef(null);
  const delayStartTimeRef = useRef(null);
  const debugIntervalRef = useRef(null);
  const lastFeedbackRef = useRef(null);
  const chartRef = useRef(null);
  const shouldStopAnimationRef = useRef(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      // Increase breakpoint to 1024px to ensure charts don't get too small
      const mobile = window.innerWidth < 1024 || 'ontouchstart' in window;
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Find chart container element for magnifier
  useEffect(() => {
    const findChartContainer = () => {
      const container = document.querySelector('.stock-chart-container');
      if (container) {
        chartRef.current = container;
      }
    };
    
    // Try to find it after a short delay to ensure chart is rendered
    const timeout = setTimeout(findChartContainer, 100);
    
    // Also try to find it after a longer delay in case chart takes time to render
    const timeout2 = setTimeout(findChartContainer, 500);
    
    return () => {
      clearTimeout(timeout);
      clearTimeout(timeout2);
    };
  }, [orderedFiles, afterData]);

  // Handle zoom animation and data reveal
  useEffect(() => {
    console.log("=== CHART SECTION AFTER DATA DEBUG ===");
    console.log("ChartSection useEffect triggered - afterData:", !!afterData, afterData ? (Array.isArray(afterData) ? `array length ${afterData.length}` : 'not array') : 'null');
    console.log("feedback state:", feedback);
    console.log("last feedback processed:", lastFeedbackRef.current);
    
    // CRITICAL: Only start animation if user has made a selection (feedback is set)
    // Animation should NEVER trigger without a selection being made first
    if (!feedback) {
      console.log("No feedback yet - waiting for user selection before animation");
      // Reset tracking when feedback is cleared (moving to new card)
      if (lastFeedbackRef.current !== null) {
        lastFeedbackRef.current = null;
        setAnimationInProgress(false);
        setShowAfterAnimation(false);
        setProgressPercentage(0);
        setZoomPercentage(0);
        setCompletionDelay(false);
        setAfterAnimationComplete(false);
        // Set stop flag to terminate any running animation
        shouldStopAnimationRef.current = true;
      }
      return;
    }
    
    // Prevent duplicate animations for the same feedback state
    const animationKey = `${feedback}-${!!afterData}`;
    if (lastFeedbackRef.current === animationKey) {
      console.log("Already processed this animation state, skipping");
      return;
    }
    
    // Mark this animation state as processed
    lastFeedbackRef.current = animationKey;
    console.log("Processing animation state after selection:", animationKey);
    
    // Clear any existing timers
    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
    if (debugIntervalRef.current) {
      clearInterval(debugIntervalRef.current);
      debugIntervalRef.current = null;
    }

    // Prevent multiple animations from starting simultaneously
    if (animationInProgress) {
      console.log("Animation already in progress, ignoring new trigger");
      return;
    }

    console.log("Animation sequence starting...", { hasAfterData: !!afterData });
    setAnimationInProgress(true);
    
    // Animation sequence with proper timing
    const animate = async () => {
      try {
        // Initial 1.5-second delay before any animation starts
        // This gives the user time to see the correct answer feedback
        // This delay is now pause-aware
        await new Promise(resolve => {
          console.log("Initial 1.5-second delay started");
          
          let remainingDelay = 1500; // 1.5 seconds in milliseconds
          let pausedTime = 0;
          let pauseStartTime = null;
          const delayStartTime = performance.now();
          
          const checkInitialDelay = () => {
            // Check if animation should be stopped (e.g., Next Stock button pressed)
            if (shouldStopAnimationRef.current || !feedback) {
              console.log("Animation stopped during initial delay");
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
              // If paused, track pause time but don't advance delay
              if (pauseStartTime === null) {
                pauseStartTime = now;
              }
              // Continue checking in case pause is released
              requestAnimationFrame(checkInitialDelay);
              return;
            }
            
            // If we were paused, add the pause duration to pausedTime
            if (pauseStartTime !== null) {
              pausedTime += now - pauseStartTime;
              pauseStartTime = null;
            }
            
            // Calculate elapsed time (excluding paused time)
            const elapsed = (now - delayStartTime) - pausedTime;
            
            if (elapsed >= remainingDelay) {
              // Delay complete
              console.log("Initial delay completed, beginning animation sequence");
              resolve();
            } else {
              // Continue checking
              requestAnimationFrame(checkInitialDelay);
            }
          };
          
          requestAnimationFrame(checkInitialDelay);
        });
        
        // Only run zoom and reveal animations if we have afterData
        if (afterData && Array.isArray(afterData) && afterData.length > 0) {
          // Step 1: Zoom animation
          await new Promise(resolve => {
            let startTime = performance.now();
            const zoomDuration = 1500; // 1.5 seconds
            
            let pausedTime = 0;
            let pauseStartTime = null;
            let lastTimestamp = startTime;
            
            const animateZoom = (timestamp) => {
              // Check if animation should be stopped (e.g., Next Stock button pressed)
              if (shouldStopAnimationRef.current || !feedback) {
                console.log("Animation stopped during zoom");
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
              
              // Check pause state on every frame
              const isPaused = isAnimationPausedRef.current;
              
              if (isPaused) {
                // If paused, track pause time but don't advance animation
                if (pauseStartTime === null) {
                  pauseStartTime = timestamp;
                }
                lastTimestamp = timestamp;
                // Continue checking in case pause is released
                animationPauseRef.current = requestAnimationFrame(animateZoom);
                return;
              }
              
              // If we were paused, add the pause duration to pausedTime
              if (pauseStartTime !== null) {
                pausedTime += timestamp - pauseStartTime;
                pauseStartTime = null;
              }
              
              const elapsed = timestamp - startTime - pausedTime;
              const progress = Math.min(elapsed / zoomDuration, 1);
              const easedProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
              
              setZoomPercentage(easedProgress * 100);
              
              if (progress < 1) {
                lastTimestamp = timestamp;
                animationPauseRef.current = requestAnimationFrame(animateZoom);
              } else {
                setZoomPercentage(100);
                animationPauseRef.current = null;
                resolve();
              }
            };
            
            animationPauseRef.current = requestAnimationFrame(animateZoom);
          });
          
          console.log("Zoom animation completed");
          
          // Check if animation should be stopped before starting reveal
          if (shouldStopAnimationRef.current || !feedback) {
            console.log("Animation stopped before reveal");
            setAnimationInProgress(false);
            setShowAfterAnimation(false);
            setProgressPercentage(0);
            setZoomPercentage(0);
            setCompletionDelay(false);
            setAfterAnimationComplete(false);
            return;
          }
          
          // Step 2: Reveal animation
          setShowAfterAnimation(true);
          await new Promise(resolve => {
            let startTime = performance.now();
            const revealDuration = 1800; // 1.8 seconds
            
            let pausedTime = 0;
            let pauseStartTime = null;
            let lastTimestamp = startTime;
            
            const animateReveal = (timestamp) => {
              // Check if animation should be stopped (e.g., Next Stock button pressed)
              if (shouldStopAnimationRef.current || !feedback) {
                console.log("Animation stopped during reveal");
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
              
              // Check pause state on every frame
              const isPaused = isAnimationPausedRef.current;
              
              if (isPaused) {
                // If paused, track pause time but don't advance animation
                if (pauseStartTime === null) {
                  pauseStartTime = timestamp;
                }
                lastTimestamp = timestamp;
                // Continue checking in case pause is released
                animationPauseRef.current = requestAnimationFrame(animateReveal);
                return;
              }
              
              // If we were paused, add the pause duration to pausedTime
              if (pauseStartTime !== null) {
                pausedTime += timestamp - pauseStartTime;
                pauseStartTime = null;
              }
              
              const elapsed = timestamp - startTime - pausedTime;
              const progress = Math.min(elapsed / revealDuration, 1);
              const easedProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
              
              setProgressPercentage(easedProgress * 100);
              
              if (progress < 1) {
                lastTimestamp = timestamp;
                animationPauseRef.current = requestAnimationFrame(animateReveal);
              } else {
                setProgressPercentage(100);
                setAfterAnimationComplete(true);
                animationPauseRef.current = null;
                resolve();
              }
            };
            
            animationPauseRef.current = requestAnimationFrame(animateReveal);
          });
          
          console.log("Reveal animation completed");
        } else {
          // No after data - just mark as complete after delay
          console.log("No afterData to animate - skipping zoom/reveal");
          setShowAfterAnimation(false);
          setProgressPercentage(0);
          setZoomPercentage(0);
          await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for consistency
          setAfterAnimationComplete(true);
        }
        
        // Set the visual state to complete
        if (afterData && Array.isArray(afterData) && afterData.length > 0) {
          setProgressPercentage(100);
          setAfterAnimationComplete(true);
        }
        
        // Ensure all visual updates have been applied before starting the delay timer
        // This forces the browser to complete all rendering before we start counting the 5 seconds
        await new Promise(resolve => {
          // Use RAF to ensure we're in the next frame after all rendering is complete
          requestAnimationFrame(() => {
            // Then use setTimeout with a small delay to be absolutely sure rendering is done
            setTimeout(() => {
              console.log("Rendering complete, now starting the FIXED 5-second delay");
              resolve();
            }, 100);
          });
        });
        
        // Step 3: Observation delay - GUARANTEED FULL 5 SECONDS
        console.log("Starting GUARANTEED 5-second observation delay");
        setCompletionDelay(true);
        
        // Reset delay timer reference to ensure fresh state
        if (delayTimerRef.current) {
          clearTimeout(delayTimerRef.current);
          delayTimerRef.current = null;
        }
        
        // Reset and restart the debug interval
        if (debugIntervalRef.current) {
          clearInterval(debugIntervalRef.current);
          debugIntervalRef.current = null;
        }
        
        // Start counting from NOW (after rendering is complete)
        delayStartTimeRef.current = Date.now();
        
        // Debug interval to track actual time elapsed (for development)
        debugIntervalRef.current = setInterval(() => {
          const elapsed = (Date.now() - delayStartTimeRef.current) / 1000;
          console.log(`Delay running: ${elapsed.toFixed(1)} seconds elapsed of 5 seconds total`);
        }, 1000);
        
        // Use a precise timeout to ensure EXACTLY 5 seconds AFTER all data is visible
        // This respects pause state by checking and adjusting the delay
        await new Promise(resolve => {
          console.log(`Observation delay started at ${new Date().toISOString()} - Will last EXACTLY 5 seconds`);
          
          let remainingDelay = 5000; // 5 seconds in milliseconds
          let pausedTime = 0;
          let pauseStartTime = null;
          
          const checkDelay = () => {
            // Check if animation should be stopped (e.g., Next Stock button pressed)
            if (shouldStopAnimationRef.current || !feedback) {
              console.log("Animation stopped during observation delay");
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
            
            // Check pause state on every check
            const isPaused = isAnimationPausedRef.current;
            
            if (isPaused) {
              // If paused, track pause time but don't advance delay
              if (pauseStartTime === null) {
                pauseStartTime = Date.now();
              }
              // Continue checking in case pause is released
              delayTimerRef.current = setTimeout(checkDelay, 100);
              return;
            }
            
            // If we were paused, add the pause duration to pausedTime
            if (pauseStartTime !== null) {
              pausedTime += Date.now() - pauseStartTime;
              pauseStartTime = null;
            }
            
            // Calculate elapsed time (excluding paused time)
            const elapsed = (Date.now() - delayStartTimeRef.current) - pausedTime;
            
            if (elapsed >= remainingDelay) {
              // Delay complete
              const actualDelay = (Date.now() - delayStartTimeRef.current) / 1000;
              console.log(`Observation delay ended after ${actualDelay.toFixed(1)} seconds`);
              
              if (debugIntervalRef.current) {
                clearInterval(debugIntervalRef.current);
                debugIntervalRef.current = null;
              }
              
              setCompletionDelay(false);
              
              // Scroll to top on mobile after delay completes
              if (isMobile) {
                console.log("Scrolling to top on mobile device");
                
                // Find the D chart element for better positioning
                const dChartElement = document.querySelector('.bg-gradient-turquoise');
                
                if (dChartElement) {
                  // Get the chart's container for better positioning
                  const chartContainer = dChartElement.closest('.rounded-xl') || dChartElement;
                  const rect = chartContainer.getBoundingClientRect();
                  
                  // Scroll to position the D chart near the top of the viewport
                  window.scrollTo({
                    top: window.pageYOffset + rect.top - 100, // Position with some padding at top
                    behavior: 'smooth'
                  });
                } else {
                  // Fallback to scrolling to top if D chart not found
                  window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                  });
                }
              }
              
              // Call the callback to advance to next card after the delay completes
              if (onAfterEffectComplete) {
                console.log("After effect completed, calling onAfterEffectComplete callback");
                onAfterEffectComplete();
              }
              
              // Mark animation as complete
              setAnimationInProgress(false);
              
              resolve();
            } else {
              // Continue checking
              delayTimerRef.current = setTimeout(checkDelay, 100);
            }
          };
          
          // Start checking
          delayTimerRef.current = setTimeout(checkDelay, 100);
        });
      } catch (error) {
        console.error("Animation sequence error:", error);
        setAnimationInProgress(false); // Reset on error
      }
    };
    
    // Start the animation sequence
    animate();
    
    // Cleanup function
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
  }, [afterData, feedback, isMobile, onAfterEffectComplete]);

  // Reset feedback tracking when moving to a new card
  useEffect(() => {
    lastFeedbackRef.current = null;
    setAnimationInProgress(false);
    setShowAfterAnimation(false);
    setProgressPercentage(0);
    setZoomPercentage(0);
    setCompletionDelay(false);
    setAfterAnimationComplete(false);
    isAnimationPausedRef.current = false;
    shouldStopAnimationRef.current = false; // Reset stop flag when moving to new card
    // Cancel any running animation frames
    if (animationPauseRef.current) {
      cancelAnimationFrame(animationPauseRef.current);
      animationPauseRef.current = null;
    }
    // Clear any timers
    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
    if (debugIntervalRef.current) {
      clearInterval(debugIntervalRef.current);
      debugIntervalRef.current = null;
    }
  }, [orderedFiles]);

  // Handle feedback being cleared (which happens when Next Stock button is clicked)
  // This stops any running animation immediately
  useEffect(() => {
    if (!feedback && lastFeedbackRef.current !== null) {
      // Feedback was cleared (Next Stock button pressed), stop animation immediately
      console.log("Feedback cleared - stopping animation immediately");
      shouldStopAnimationRef.current = true;
      
      // Immediately stop and clean up any running animations
      setAnimationInProgress(false);
      setShowAfterAnimation(false);
      setProgressPercentage(0);
      setZoomPercentage(0);
      setCompletionDelay(false);
      setAfterAnimationComplete(false);
      
      // Cancel any running animation frames
      if (animationPauseRef.current) {
        cancelAnimationFrame(animationPauseRef.current);
        animationPauseRef.current = null;
      }
      
      // Clear any timers
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }
      if (debugIntervalRef.current) {
        clearInterval(debugIntervalRef.current);
        debugIntervalRef.current = null;
      }
    } else if (feedback) {
      // Reset stop flag when new feedback is set (new selection made)
      shouldStopAnimationRef.current = false;
    }
  }, [feedback]);

  // Timer color based on remaining time
  const getTimerColor = () => {
    if (timer <= 10) return "text-red-600";
    if (timer <= 30) return "text-yellow-600";
    return "text-turquoise-600";
  };

  return (
    <>
      {/* Main content with Daily and Hourly charts */}
      <div className="flex flex-col pt-1 sm:pt-2 px-2 sm:px-6 md:px-10 lg:flex-row gap-4 items-center lg:items-start">
        {/* Daily chart section - primary chart */}
        <div className="w-full lg:w-3/5 flex flex-col items-center bg-transparent rounded-lg shadow-md p-0 mt-4 sm:mt-6">
          <div className="w-full relative rounded-xl overflow-hidden shadow-lg bg-black border border-white transition-all duration-300" style={{ width: '100%', aspectRatio: isMobile ? 'auto' : '1 / 1', minHeight: isMobile ? '500px' : 'auto', maxHeight: isMobile ? '800px' : 'none', height: isMobile ? 'auto' : 'auto', margin: 0, padding: 0, boxSizing: 'border-box', overflow: 'hidden' }}>
            {/* D Label and Timer - positioned in the top left */}
            <div className="absolute top-2 left-2 z-30 flex items-center gap-3 sm:gap-4">
              <div className="text-white font-bold bg-gradient-turquoise px-3 sm:px-2 py-1.5 sm:py-1 rounded-md text-lg sm:text-base shadow-lg">
                D
              </div>
              <div className="inline-flex items-center gap-1.5 bg-black/80 backdrop-blur-sm pl-2.5 pr-4 sm:pl-3 sm:pr-5 py-1.5 sm:py-1.5 rounded-md border border-white/40 shadow-lg ml-2 sm:ml-3">
                <svg className="w-4 h-4 sm:w-4 sm:h-4 text-turquoise-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span className={`text-base sm:text-lg font-bold ${getTimerColor()}`}>
                  {timer}s
                </span>
              </div>
            </div>
            <div className={`absolute inset-0 rounded-lg overflow-hidden ${isTimeUp ? 'filter blur-xl' : ''} relative transition-opacity duration-300`} style={{ height: '100%', width: '100%' }}>
              {/* Combined chart display - always shows D data, adds after data progressively when available */}
              {orderedFiles && orderedFiles.length > 0 && orderedFiles[0]?.data ? (
                <>
                  <StockChart 
                    data={orderedFiles[0].data} 
                    afterData={afterData}
                    showAfterAnimation={showAfterAnimation}
                    progressPercentage={progressPercentage}
                    zoomPercentage={zoomPercentage}
                    isInDelayPhase={completionDelay}
                    afterAnimationComplete={afterAnimationComplete}
                    showSMA={true}
                    onChartClick={onChartClick}
                    userSelection={userSelection}
                    targetPoint={targetPoint}
                    disabled={disabled || (score !== null && score !== undefined)}
                  />
                  {/* Magnifying glass tool - properly integrated */}
                  {onChartClick && !disabled && score === null && (
                    <ChartMagnifier
                      onSelection={(syntheticEvent) => {
                        console.log('[ChartSection] onSelection called with:', syntheticEvent);
                        // Bypass ChartMagnifier's click blocker by calling the handler directly
                        // We need to access the SVG's onClick handler and call it with the event
                        if (chartRef.current) {
                          const svgElement = chartRef.current.querySelector('svg');
                          if (svgElement) {
                            console.log('[ChartSection] SVG element found, accessing onClick handler');
                            
                            // Create a proper MouseEvent-like object for the handler
                            const clickEvent = {
                              clientX: syntheticEvent.clientX,
                              clientY: syntheticEvent.clientY,
                              preventDefault: () => {},
                              stopPropagation: () => {},
                              currentTarget: svgElement,
                              target: svgElement,
                            };
                            
                            // Try to access React's onClick handler directly via React Fiber
                            // This bypasses the ChartMagnifier's click blocker
                            const reactFiberKey = Object.keys(svgElement).find(key => 
                              key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance')
                            );
                            
                            if (reactFiberKey) {
                              const fiber = svgElement[reactFiberKey];
                              let currentFiber = fiber;
                              
                              // Search through the fiber tree to find the onClick handler
                              while (currentFiber) {
                                // Check memoizedProps first (most common)
                                if (currentFiber.memoizedProps?.onClick) {
                                  console.log('[ChartSection] Found onClick in memoizedProps, calling directly');
                                  try {
                                    currentFiber.memoizedProps.onClick(clickEvent);
                                    console.log('[ChartSection] onClick handler called successfully');
                                    return;
                                  } catch (error) {
                                    console.error('[ChartSection] Error calling onClick handler:', error);
                                  }
                                }
                                
                                // Check pendingProps as fallback
                                if (currentFiber.pendingProps?.onClick) {
                                  console.log('[ChartSection] Found onClick in pendingProps, calling directly');
                                  try {
                                    currentFiber.pendingProps.onClick(clickEvent);
                                    console.log('[ChartSection] onClick handler called successfully');
                                    return;
                                  } catch (error) {
                                    console.error('[ChartSection] Error calling onClick handler:', error);
                                  }
                                }
                                
                                currentFiber = currentFiber.return; // Move up the tree
                              }
                              
                              console.warn('[ChartSection] onClick handler not found in React Fiber tree');
                            } else {
                              console.warn('[ChartSection] React Fiber key not found on SVG element');
                            }
                            
                            // Final fallback: Try dispatching a non-bubbling event directly on SVG
                            try {
                              const directClickEvent = new MouseEvent('click', {
                                bubbles: false, // Don't bubble to avoid blocker
                                cancelable: false,
                                composed: true,
                                view: window,
                                clientX: syntheticEvent.clientX,
                                clientY: syntheticEvent.clientY,
                              });
                              svgElement.dispatchEvent(directClickEvent);
                              console.log('[ChartSection] Fallback: dispatched non-bubbling event');
                            } catch (error) {
                              console.error('[ChartSection] All methods failed:', error);
                            }
                          } else {
                            console.warn('[ChartSection] SVG element not found in chartRef');
                          }
                        } else {
                          console.warn('[ChartSection] chartRef.current is null');
                        }
                      }}
                      enabled={!disabled && score === null}
                      chartElement={chartRef.current || null}
                      mainDataLength={orderedFiles && orderedFiles[0]?.data ? orderedFiles[0].data.length : 0}
                    />
                  )}
                  {/* Score overlay - appears after selection */}
                  {score !== null && feedback && (
                    <ChartScoreOverlay 
                      score={score}
                      accuracyTier={getAccuracyTier(score)}
                      show={true}
                      onNext={onNextCard}
                      isMobile={isMobile}
                      alwaysPaused={timerDuration === 0}
                      onPauseChange={handlePauseChange}
                    />
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-black rounded-lg">
                  {/* Empty state - parent will handle loading */}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: H Chart + Points Grid - Now visible on mobile */}
        <div className="flex w-full lg:w-2/5 flex-col gap-3 sm:gap-4 mt-4 sm:mt-6">
          {/* H Chart */}
          <div className="relative w-full rounded-xl overflow-hidden shadow-lg bg-black border border-white transition-all duration-300" style={{ width: '100%', aspectRatio: '1 / 1', margin: 0, padding: 0, boxSizing: 'border-box' }}>
            {/* H Label - positioned in the top left */}
            <div className="absolute top-2 left-2 text-white font-bold z-30 bg-gradient-to-r from-turquoise-700 to-turquoise-600 px-3 sm:px-2 py-1.5 sm:py-1 rounded-md text-lg sm:text-base shadow-lg">
              H
            </div>
            <div className={`absolute inset-0 overflow-hidden ${isTimeUp ? 'filter blur-xl' : ''} transition-opacity duration-300`} style={{ height: '100%', width: '100%', margin: 0, padding: 0, boxSizing: 'border-box' }}>
              <StockChart 
                data={orderedFiles[1]?.data}
                backgroundColor="black" 
                showSMA={true} 
                chartType="hourly"
                forceShowSMA={true}
              />
            </div>
          </div>
          
          {/* Points Labels - Flexible flow layout that only wraps when necessary */}
          <div className={`flex flex-wrap gap-2 sm:gap-2.5 md:gap-3 bg-transparent rounded-lg shadow-md p-2 sm:p-3 md:p-4 ${isTimeUp ? 'filter blur-xl' : ''}`}>
            {(() => {
              // Ensure we have a valid array - handle undefined/null gracefully
              const safePointsArray = Array.isArray(pointsTextArray) ? pointsTextArray : (pointsTextArray ? [pointsTextArray] : []);
              
              if (safePointsArray.length > 0) {
                return safePointsArray.map((text, index) => {
                  const displayText = text && typeof text === 'string' ? text.trim() : '';
                  return (
                    <div
                      key={`point-${index}-${displayText || index}`}
                      className={`inline-flex items-center rounded-lg shadow-md px-4 py-2.5 text-sm sm:text-base font-semibold transition-all duration-300 whitespace-nowrap ${
                        displayText ? "bg-gradient-to-br from-turquoise-600 to-turquoise-500 text-white hover:from-turquoise-700 hover:to-turquoise-600 hover:shadow-lg hover:scale-105 cursor-default" : "invisible"
                      }`}
                    >
                      {displayText || "\u00A0"}
                    </div>
                  );
                });
              } else {
                // Show placeholder boxes when no points data is available
                return Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`placeholder-${index}`}
                    className="rounded-lg shadow-md px-4 py-2.5 text-sm sm:text-base flex items-center justify-center h-auto transition-all duration-300 invisible whitespace-nowrap"
                  >
                    {"\u00A0"}
                  </div>
                ));
              }
            })()}
          </div>
        </div>
      </div>
    </>
  );
}

export default React.memo(ChartSection, (prevProps, nextProps) => {
  // Custom comparison to ensure pointsTextArray changes trigger re-render
  // Also compare other props that might affect rendering
  const pointsEqual = JSON.stringify(prevProps.pointsTextArray || []) === JSON.stringify(nextProps.pointsTextArray || []);
  const otherPropsEqual = (
    prevProps.orderedFiles === nextProps.orderedFiles &&
    prevProps.afterData === nextProps.afterData &&
    prevProps.timer === nextProps.timer &&
    prevProps.feedback === nextProps.feedback &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.isTimeUp === nextProps.isTimeUp &&
    prevProps.onChartClick === nextProps.onChartClick &&
    prevProps.userSelection === nextProps.userSelection &&
    prevProps.targetPoint === nextProps.targetPoint &&
    prevProps.distance === nextProps.distance &&
    prevProps.score === nextProps.score
  );
  
  // Return true if props are equal (skip re-render), false if they differ (re-render)
  return pointsEqual && otherPropsEqual;
});
