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
import SelectionTooltip from "../UI/SelectionTooltip";
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
      <div className={`bg-black/95 backdrop-blur-sm border border-white/30 rounded-md shadow-lg pointer-events-auto relative overflow-hidden w-full flex flex-col ${
        isMobile 
          ? 'px-3 py-3' 
          : 'px-3 py-3'
      }`}>
        <div className={`relative z-10 ${isMobile ? 'flex items-center justify-between gap-2' : 'flex items-center justify-between gap-3'}`}>
          {/* Left side: Score */}
          <div className={`flex items-center gap-2 ${isMobile ? '' : ''}`}>
            <div className="flex flex-col">
              {!isMobile && <p className="text-xs text-white/70 uppercase tracking-widest mb-0.5">Score</p>}
              <h3 className={`font-semibold text-white tracking-tight ${isMobile ? 'text-xl' : 'text-xl'}`}>
                {Math.round(score)}%
              </h3>
            </div>
          </div>
          
          {/* Right side: Countdown and buttons in one row on mobile */}
          <div className={`flex items-center gap-2 flex-shrink-0 ${isMobile ? 'flex-1 justify-end' : ''}`}>
            {/* Countdown (when not paused and not always paused) */}
            {!alwaysPaused && !isPaused && (
              <div className="flex items-center gap-1">
                <p className={`text-white/70 whitespace-nowrap ${isMobile ? 'text-[10px]' : 'text-xs'}`}>{isMobile ? 'Next' : 'Next in'}</p>
                <div className={`flex items-center justify-center rounded-md bg-turquoise-500/20 border border-turquoise-500/30 ${
                  isMobile ? 'w-5 h-5' : 'w-7 h-7'
                }`}>
                  <span className={`font-semibold text-turquoise-400 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>{countdown}</span>
                </div>
                <p className={`text-white/70 whitespace-nowrap ${isMobile ? 'text-[10px]' : 'text-xs'}`}>s</p>
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
                className={`bg-black/95 backdrop-blur-sm hover:bg-black/80 text-white/90 hover:text-white rounded-md font-medium transition-all border border-white/30 relative z-20 ${
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
                data-tutorial-next
                className={`bg-turquoise-500/20 hover:bg-turquoise-500/30 text-turquoise-400 hover:text-turquoise-300 rounded-md font-medium transition-all border border-turquoise-500/30 ${
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
  onDismissTooltip = null, // Callback to dismiss the selection tooltip
  onTimerPause = null, // Callback to pause the timer
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

  const handleChartAreaClickCapture = useCallback((event) => {
    if (isTimeUp && score === null) {
      event.stopPropagation();
      event.preventDefault();
      if (onDismissTooltip) {
        onDismissTooltip({ reason: 'manual-chart' });
      }
    }
  }, [isTimeUp, score, onDismissTooltip]);
  const [completionDelay, setCompletionDelay] = useState(false);
  const [afterAnimationComplete, setAfterAnimationComplete] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [animationInProgress, setAnimationInProgress] = useState(false);
  
  // Pause timer when animation is in progress
  useEffect(() => {
    if (animationInProgress && onTimerPause) {
      onTimerPause();
    }
  }, [animationInProgress, onTimerPause]);
  const [showTimerPopup, setShowTimerPopup] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [popupPosition, setPopupPosition] = useState({ top: '0px', left: '0px', right: 'auto', bottom: 'auto' });
  const customInputRef = useRef(null);
  const timerPopupRef = useRef(null);
  const timerTriggerRef = useRef(null);
  const timerContainerRef = useRef(null);
  const dLabelRef = useRef(null);
  const [timerRightEdge, setTimerRightEdge] = useState(null);
  const [timerLeftEdge, setTimerLeftEdge] = useState(null);
  const [dLabelRightEdge, setDLabelRightEdge] = useState(null);
  const [dLabelCenterY, setDLabelCenterY] = useState(null);
  const [smaLabelRightEdge, setSmaLabelRightEdge] = useState(null);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [infoPopupPersistent, setInfoPopupPersistent] = useState(false);
  const infoPopupRef = useRef(null);
  const infoButtonRef = useRef(null);
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

  // Calculate D label right edge and timer right edge for SMA label alignment
  useEffect(() => {
    const calculateEdges = () => {
      const chartContainer = document.querySelector('.rounded-md');
      if (!chartContainer) return;
      
      const chartRect = chartContainer.getBoundingClientRect();
      const svg = chartContainer.querySelector('svg');
      if (!svg) return;
      
      const svgRect = svg.getBoundingClientRect();
      
      // Calculate D label right edge and center Y
      if (dLabelRef.current) {
        const dRect = dLabelRef.current.getBoundingClientRect();
        const dRightRelative = dRect.right - svgRect.left;
        // Calculate center Y relative to SVG (for vertical alignment)
        const dCenterY = dRect.top + (dRect.height / 2) - svgRect.top;
        setDLabelRightEdge(dRightRelative);
        setDLabelCenterY(dCenterY);
        
        // Calculate SMA label right edge (SMA label is 110px wide, positioned 8px after D label)
        const smaLabelWidth = 110;
        const smaLabelRightRelative = dRightRelative + 8 + smaLabelWidth;
        setSmaLabelRightEdge(smaLabelRightRelative);
      }
      
      // Calculate timer edges
      if (timerContainerRef.current) {
        const timerRect = timerContainerRef.current.getBoundingClientRect();
        const timerRightRelative = timerRect.right - svgRect.left;
        const timerLeftRelative = timerRect.left - svgRect.left;
        setTimerRightEdge(timerRightRelative);
        setTimerLeftEdge(timerLeftRelative);
      }
    };

    // Use a small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      calculateEdges();
    }, 100);

    window.addEventListener('resize', calculateEdges);
    window.addEventListener('scroll', calculateEdges, true);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', calculateEdges);
      window.removeEventListener('scroll', calculateEdges, true);
    };
  }, [timer, isMobile, orderedFiles]);

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
          // Pause the timer when animation starts
          if (onTimerPause) {
            onTimerPause();
          }
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
                  const chartContainer = dChartElement.closest('.rounded-md') || dChartElement;
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
  // This triggers when orderedFiles changes (new card loaded) OR when feedback is cleared
  useEffect(() => {
    // Only reset if we don't have active feedback (to avoid resetting during animation)
    if (!feedback) {
      console.log("Resetting animation state - new card or feedback cleared");
      lastFeedbackRef.current = null;
      setAnimationInProgress(false);
      setShowAfterAnimation(false);
      setProgressPercentage(0);
      setZoomPercentage(0);
      setCompletionDelay(false);
      setAfterAnimationComplete(false);
      isAnimationPausedRef.current = false;
      shouldStopAnimationRef.current = true; // Set stop flag to prevent any running animations
      
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
    }
  }, [orderedFiles, feedback]);

  // Handle feedback being cleared (which happens when Next Stock button is clicked)
  // This stops any running animation immediately and ensures clean state
  useEffect(() => {
    if (!feedback) {
      // Feedback was cleared (Next Stock button pressed or new card), stop animation immediately
      if (lastFeedbackRef.current !== null || animationInProgress || showAfterAnimation) {
        console.log("Feedback cleared - stopping animation immediately and resetting state");
        shouldStopAnimationRef.current = true;
        
        // Immediately stop and clean up any running animations
        setAnimationInProgress(false);
        setShowAfterAnimation(false);
        setProgressPercentage(0);
        setZoomPercentage(0);
        setCompletionDelay(false);
        setAfterAnimationComplete(false);
        lastFeedbackRef.current = null;
        isAnimationPausedRef.current = false;
        
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
      }
    } else if (feedback) {
      // Reset stop flag when new feedback is set (new selection made)
      shouldStopAnimationRef.current = false;
    }
  }, [feedback, animationInProgress, showAfterAnimation]);

  // Timer duration selector logic
  const durations = useMemo(() => [
    { value: 30, label: "30 seconds" },
    { value: 60, label: "1 minute" },
    { value: 120, label: "2 minutes" },
    { value: 180, label: "3 minutes" },
  ], []);

  const presetValues = useMemo(() => 
    durations.map(option => Number(option.value)),
    [durations]
  );

  const isPreset = useMemo(() => {
    if (timerDuration === 0) return false;
    return presetValues.includes(timerDuration);
  }, [timerDuration, presetValues]);

  const formatDuration = (seconds) => {
    if (seconds < 60) {
      return `${seconds} seconds`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
    return `${minutes} minute${minutes > 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''}`;
  };

  const handlePresetClick = (value) => {
    if (onTimerDurationChange) {
      onTimerDurationChange(Number(value));
    }
    setShowTimerPopup(false);
    setShowCustomInput(false);
  };

  const handleCustomClick = () => {
    setShowCustomInput(true);
    setCustomValue("");
  };

  const handleCustomInputChange = (e) => {
    setCustomValue(e.target.value);
  };

  const handleCustomSubmit = () => {
    let numValue = 60;
    if (customValue && !isNaN(customValue)) {
      numValue = Math.max(1, Math.round(Number(customValue)));
    }
    if (onTimerDurationChange) {
      onTimerDurationChange(numValue);
    }
    setShowTimerPopup(false);
    setShowCustomInput(false);
    setCustomValue("");
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleCustomSubmit();
    } else if (e.key === 'Escape') {
      setShowCustomInput(false);
      setCustomValue("");
    }
  };

  // Focus input when custom input is shown
  useEffect(() => {
    if (showCustomInput && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [showCustomInput]);

  // Calculate popup position for absolute positioning relative to timer container
  useEffect(() => {
    if (!showTimerPopup || !timerContainerRef.current) {
      return;
    }

    const calculatePosition = () => {
      if (!timerContainerRef.current || !timerPopupRef.current) return;
      
      const timerContainer = timerContainerRef.current;
      const popup = timerPopupRef.current;
      const timerRect = timerContainer.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Get parent container (the chart container that holds both timer and popup)
      const chartContainer = timerContainer.closest('[class*="chartContainer"]') || timerContainer.parentElement?.parentElement?.parentElement;
      if (!chartContainer) return;
      
      const chartRect = chartContainer.getBoundingClientRect();
      
      // Get popup dimensions
      const popupRect = popup.getBoundingClientRect();
      const popupWidth = popupRect.width || 200;
      const popupHeight = popupRect.height || 250;
      const gap = 8;
      
      // Calculate available space in viewport
      const spaceOnRight = viewportWidth - timerRect.right;
      const spaceOnLeft = timerRect.left;
      const spaceBelow = viewportHeight - timerRect.bottom;
      
      // Since popup is now a sibling of timer container, position it relative to chart container
      const timerHeight = timerRect.height;
      const timerWidth = timerRect.width;
      
      // Calculate position relative to chart container
      const timerTopRelative = timerRect.top - chartRect.top;
      const timerLeftRelative = timerRect.left - chartRect.left;
      
      // Position below timer container
      let top = timerTopRelative + timerHeight + gap;
      
      // Calculate where popup would be positioned relative to chart container
      // Default: align right edge of popup with right edge of timer container
      let left = timerLeftRelative + timerWidth - popupWidth;
      
      // Calculate actual viewport positions
      let popupLeftEdge = timerRect.left + left;
      let popupRightEdge = popupLeftEdge + popupWidth;
      
      // On mobile, prefer aligning left edge of popup with left edge of timer
      if (isMobile) {
        left = timerLeftRelative; // Align with timer's left edge relative to chart
        popupLeftEdge = chartRect.left + left;
        popupRightEdge = popupLeftEdge + popupWidth;
        
        // If it goes off right edge, adjust to fit
        if (popupRightEdge > viewportWidth - 8) {
          left = viewportWidth - chartRect.left - popupWidth - 8;
          // Ensure it doesn't go negative
          if (left < 0) {
            left = timerLeftRelative;
          }
          popupLeftEdge = chartRect.left + left;
          popupRightEdge = popupLeftEdge + popupWidth;
        }
        
        // Ensure it doesn't go off left edge
        if (popupLeftEdge < 8) {
          left = 8 - chartRect.left;
          if (left < 0) left = timerLeftRelative;
        }
      } else {
        // Desktop: try to align right edge of popup with right edge of timer, but ensure it stays on screen
        // Default: align right edge of popup with right edge of timer (relative to chart)
        left = timerLeftRelative + timerWidth - popupWidth;
        popupLeftEdge = chartRect.left + left;
        popupRightEdge = popupLeftEdge + popupWidth;
        
        // If it goes off left edge, adjust
        if (popupLeftEdge < 8) {
          // Try aligning left edge with timer's left edge
          left = 0;
          popupLeftEdge = timerRect.left;
          popupRightEdge = popupLeftEdge + popupWidth;
          
          // If that goes off right, adjust to fit
          if (popupRightEdge > viewportWidth - 8) {
            left = viewportWidth - timerRect.left - popupWidth - 8;
            if (left < 0) left = 0;
            popupLeftEdge = timerRect.left + left;
            popupRightEdge = popupLeftEdge + popupWidth;
          }
        }
        
        // If it goes off right edge, adjust
        if (popupRightEdge > viewportWidth - 8) {
          // Try positioning on left side of timer
          if (spaceOnLeft >= popupWidth) {
            left = -popupWidth;
            popupLeftEdge = timerRect.left + left;
            // Ensure it doesn't go off left
            if (popupLeftEdge < 8) {
              left = -timerRect.left + 8;
              if (left < 0) left = 0;
            }
            popupLeftEdge = timerRect.left + left;
            popupRightEdge = popupLeftEdge + popupWidth;
          } else {
            // Adjust to fit within viewport
            left = viewportWidth - timerRect.left - popupWidth - 8;
            if (left < 0) left = 0;
            popupLeftEdge = timerRect.left + left;
            popupRightEdge = popupLeftEdge + popupWidth;
          }
        }
        
        // Final check: ensure it doesn't go off left edge
        if (popupLeftEdge < 8) {
          left = 8 - timerRect.left;
          if (left < 0) left = 0;
          popupLeftEdge = timerRect.left + left;
          popupRightEdge = popupLeftEdge + popupWidth;
        }
      }
      
      // Final comprehensive boundary checks to ensure popup never goes off screen
      // Recalculate final positions in viewport coordinates
      popupLeftEdge = timerRect.left + left;
      popupRightEdge = popupLeftEdge + popupWidth;
      const popupTopEdge = timerRect.top + top;
      const popupBottomEdge = timerRect.bottom + top + popupHeight;
      
      // Force popup to stay within viewport bounds (with 8px padding)
      // Left edge check - most important
      if (popupLeftEdge < 8) {
        left = 8 - timerRect.left;
        // Recalculate
        popupLeftEdge = timerRect.left + left;
        popupRightEdge = popupLeftEdge + popupWidth;
      }
      
      // Right edge check
      if (popupRightEdge > viewportWidth - 8) {
        left = viewportWidth - timerRect.left - popupWidth - 8;
        // Recalculate
        popupLeftEdge = timerRect.left + left;
        popupRightEdge = popupLeftEdge + popupWidth;
        
        // If adjusting for right edge made it go off left, fix it
        if (popupLeftEdge < 8) {
          left = 8 - timerRect.left;
          popupLeftEdge = timerRect.left + left;
          popupRightEdge = popupLeftEdge + popupWidth;
          
          // If popup is wider than viewport, at least keep it from going off left
          if (popupRightEdge > viewportWidth - 8) {
            // Popup is too wide, but at least keep left edge on screen
            // The width constraint will handle the rest
            left = 8 - timerRect.left;
          }
        }
      }
      
      // Double-check: ensure we're still within bounds after all adjustments
      const finalLeftEdge = timerRect.left + left;
      const finalRightEdge = finalLeftEdge + popupWidth;
      
      if (finalLeftEdge < 8) {
        left = 8 - timerRect.left;
      }
      if (finalRightEdge > viewportWidth - 8) {
        left = viewportWidth - timerRect.left - popupWidth - 8;
        // Final safety: if still off, position from left
        if (timerRect.left + left < 8) {
          left = 8 - timerRect.left;
        }
      }
      
      // Ensure popup doesn't go off top edge of viewport (with padding)
      if (popupTopEdge < 8) {
        top = 8 - timerRect.top;
        // But ensure it's still below the timer
        if (top < timerHeight + gap) {
          top = timerHeight + gap;
        }
      }
      
      // Ensure popup doesn't go off bottom edge of viewport (with padding)
      if (popupBottomEdge > viewportHeight - 8) {
        const overflow = popupBottomEdge - (viewportHeight - 8);
        top = Math.max(timerHeight + gap, top - overflow);
        // Recalculate to make sure it's still valid
        const newBottomEdge = timerRect.bottom + top + popupHeight;
        if (newBottomEdge > viewportHeight - 8) {
          // If still off, position it as high as possible while staying below timer
          top = Math.max(timerHeight + gap, viewportHeight - 8 - (timerRect.bottom - timerRect.top) - popupHeight);
        }
      }
      
      // Final absolute safety check: ensure popup never goes off screen
      // Recalculate one more time with final values
      const finalLeftEdgeCheck = timerRect.left + left;
      const finalRightEdgeCheck = finalLeftEdgeCheck + popupWidth;
      
      // Force left edge to be at least 8px from viewport left
      if (finalLeftEdgeCheck < 8) {
        left = 8 - timerRect.left;
      }
      
      // Force right edge to be at most viewportWidth - 8px
      if (finalRightEdgeCheck > viewportWidth - 8) {
        left = viewportWidth - timerRect.left - popupWidth - 8;
        // If that makes left edge go off, position from left
        if (timerRect.left + left < 8) {
          left = 8 - timerRect.left;
        }
      }
      
      // Final safety check: ensure left is not negative (relative to timer container)
      if (left < 0 && timerRect.left + left < 8) {
        left = Math.max(0, 8 - timerRect.left);
      }
      
      // Final safety check: ensure top is not negative (relative to timer container)
      if (top < 0) {
        top = timerHeight + gap;
      }
      
      setPopupPosition({ top: `${top}px`, left: `${left}px`, right: 'auto', bottom: 'auto' });
    };

    // Calculate position after popup is rendered
    const timeoutId = setTimeout(() => {
      calculatePosition();
      setTimeout(calculatePosition, 10);
      setTimeout(calculatePosition, 50);
    }, 0);

    // Recalculate on resize and scroll
    window.addEventListener('resize', calculatePosition);
    window.addEventListener('scroll', calculatePosition, true);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition, true);
    };
  }, [showTimerPopup]);

  // Close popup when clicking outside
  useEffect(() => {
    if (!showTimerPopup) return;

    function handleClickOutside(event) {
      if (timerPopupRef.current && !timerPopupRef.current.contains(event.target)) {
        const timerTrigger = event.target.closest('[data-timer-trigger]');
        if (!timerTrigger) {
          setShowTimerPopup(false);
          setShowCustomInput(false);
          setCustomValue("");
        }
      }
    }

    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showTimerPopup]);

  // Close info popup when clicking outside (unless persistent)
  useEffect(() => {
    if (!showInfoPopup || infoPopupPersistent) {
      return;
    }

    const handleClickOutside = (event) => {
      if (
        infoPopupRef.current &&
        !infoPopupRef.current.contains(event.target) &&
        infoButtonRef.current &&
        !infoButtonRef.current.contains(event.target)
      ) {
        setShowInfoPopup(false);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showInfoPopup, infoPopupPersistent]);

  // Timer color based on remaining time
  const getTimerColor = () => {
    if (timer <= 10) return "text-red-600";
    if (timer <= 30) return "text-yellow-600";
    return "text-turquoise-600";
  };

  // Extract ticker and breakout date from orderedFiles
  const stockInfo = useMemo(() => {
    if (!orderedFiles || orderedFiles.length === 0 || !orderedFiles[0]?.fileName) {
      return { ticker: null, breakoutDate: null };
    }
    
    // Extract from fileName like "AAL_Dec_11_2006/D.json"
    const fileName = orderedFiles[0].fileName;
    const parts = fileName.split('/');
    const directoryName = parts[0] || fileName;
    
    // Parse format: "AAL_Dec_11_2006" -> ticker: "AAL", date: "Dec 11, 2006"
    const underscoreIndex = directoryName.indexOf('_');
    if (underscoreIndex === -1) {
      return { ticker: directoryName, breakoutDate: null };
    }
    
    const ticker = directoryName.substring(0, underscoreIndex);
    const datePart = directoryName.substring(underscoreIndex + 1);
    
    // Parse date: "Dec_11_2006" -> "Dec 11, 2006"
    const dateParts = datePart.split('_');
    if (dateParts.length >= 3) {
      const month = dateParts[0];
      const day = dateParts[1];
      const year = dateParts[2];
      const formattedDate = `${month} ${day}, ${year}`;
      return { ticker, breakoutDate: formattedDate };
    }
    
    return { ticker, breakoutDate: datePart.replace(/_/g, ' ') };
  }, [orderedFiles]);

  const chartContainerClasses = `w-full relative rounded-md overflow-hidden shadow-lg bg-black border border-white/30 transition-all duration-300`;

  return (
    <>
      {/* Main content with Daily chart */}
      <div className="flex flex-col pt-1 sm:pt-2 lg:pt-2 px-1 sm:px-6 md:px-10 lg:pr-2 gap-4 items-start w-full">
        {/* Daily chart section - primary chart */}
        <div className="w-full flex flex-col items-start bg-transparent rounded-md shadow-md p-0 py-1 lg:py-0">
          <div
            className={chartContainerClasses}
            style={{ 
              width: '100%', 
              height: isMobile ? '500px' : '600px', // Fixed height - never changes between stocks
              minHeight: isMobile ? '500px' : '600px',
              maxHeight: isMobile ? '500px' : '600px',
              margin: 0, 
              padding: 0, 
              boxSizing: 'border-box', 
              overflow: 'hidden' 
            }}
            onClickCapture={handleChartAreaClickCapture}
          >
            {/* D Label, SMA Labels, and Timer - positioned in the top left, same row */}
            <div className="absolute top-2 left-2 z-30 flex items-start gap-2 sm:gap-3">
              <div className="flex flex-col gap-1 items-center">
                <div ref={dLabelRef} className="text-white font-semibold bg-black/95 backdrop-blur-sm px-3 sm:px-2 py-1.5 sm:py-1 rounded-md text-lg sm:text-base border border-white/30 shadow-lg">
                  D
                </div>
                {/* Info Button - directly below D label */}
                <button
                  ref={infoButtonRef}
                  onClick={(e) => {
                    e.stopPropagation();
                    const newPersistent = !infoPopupPersistent;
                    setInfoPopupPersistent(newPersistent);
                    setShowInfoPopup(newPersistent || !showInfoPopup);
                  }}
                  className={`inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-black/95 backdrop-blur-sm rounded-md shadow-lg transition-colors ${
                    infoPopupPersistent ? 'text-white/70' : 'text-white/70 hover:text-white/90 hover:bg-black/80'
                  }`}
                  title="Stock Information"
                >
                  <svg className="w-6 h-6 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </button>
              </div>
              {/* SMA Labels - HTML version displayed in 3 rows, matching D label and timer height */}
              <div className="inline-flex flex-col gap-0.5 bg-black/95 backdrop-blur-sm px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-md border border-white/30 shadow-lg">
                {/* 10 SMA */}
                <div className="flex items-center gap-1.5">
                  <div className="w-[18px] h-[2.5px] rounded-md" style={{ backgroundColor: '#00D4FF' }}></div>
                  <span className="text-xs sm:text-sm text-white/90 font-medium whitespace-nowrap">10 SMA</span>
                </div>
                {/* 20 SMA */}
                <div className="flex items-center gap-1.5">
                  <div className="w-[18px] h-[2.5px] rounded-md" style={{ backgroundColor: '#7C3AED' }}></div>
                  <span className="text-xs sm:text-sm text-white/90 font-medium whitespace-nowrap">20 SMA</span>
                </div>
                {/* 50 SMA */}
                <div className="flex items-center gap-1.5">
                  <div className="w-[18px] h-[2.5px] rounded-md" style={{ backgroundColor: '#F59E0B' }}></div>
                  <span className="text-xs sm:text-sm text-white/90 font-medium whitespace-nowrap">50 SMA</span>
                </div>
              </div>
              <div ref={timerContainerRef} className="relative inline-flex items-center gap-1.5 sm:gap-2">
                <div data-tutorial-timer className="inline-flex items-center gap-1.5 bg-black/80 backdrop-blur-sm pl-2.5 pr-3 sm:pl-3 sm:pr-3 py-1.5 sm:py-1 rounded-md border border-white/40 shadow-lg">
                  <svg className="w-4 h-4 sm:w-4 sm:h-4 text-white/70 -ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span className={`text-base sm:text-lg font-semibold font-mono ${getTimerColor()}`}>
                    {timer}s
                  </span>
                </div>
                {/* Dropdown arrow */}
                {onTimerDurationChange && (
                  <>
                    <button
                      ref={timerTriggerRef}
                      data-tutorial-timer-duration
                      data-timer-trigger
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTimerPopup(!showTimerPopup);
                      }}
                      className="inline-flex items-center justify-center w-5 h-5 sm:w-5 sm:h-5 text-white hover:text-white/80 transition-colors cursor-pointer"
                      aria-label="Timer duration options"
                    >
                      <svg className={`w-4 h-4 sm:w-4 sm:h-4 transition-transform ${showTimerPopup ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
            {/* Timer Popup - moved outside container to ensure proper z-index stacking */}
            {showTimerPopup && (
              <div
                ref={timerPopupRef}
                className="absolute z-[100] bg-black/95 backdrop-blur-md rounded-md border border-white/30 shadow-2xl overflow-hidden"
                style={{
                  top: popupPosition.top,
                  bottom: popupPosition.bottom,
                  left: popupPosition.left,
                  right: popupPosition.right,
                  width: isMobile ? '160px' : '200px',
                }}
              >
                        {/* Custom input section */}
                        {showCustomInput ? (
                          <div className="p-3">
                            <input
                              ref={customInputRef}
                              type="number"
                              value={customValue}
                              onChange={handleCustomInputChange}
                              onKeyDown={handleKeyPress}
                              min="1"
                              max="1800"
                              placeholder="Seconds..."
                              className="w-full px-3 py-2 bg-black/50 border border-white/30 rounded text-white text-sm placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-turquoise-500 focus:border-turquoise-500 mb-3"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={handleCustomSubmit}
                                className="flex-1 px-3 py-1.5 bg-turquoise-600 hover:bg-turquoise-500 text-white rounded text-sm font-medium transition"
                              >
                                Set
                              </button>
                              <button
                                onClick={() => {
                                  setShowCustomInput(false);
                                  setCustomValue("");
                                }}
                                className="flex-1 px-3 py-1.5 border border-white/30 rounded text-white/80 hover:text-white hover:border-white/50 transition text-sm font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="py-1.5">
                            {/* Selection options */}
                            {durations.map((option) => (
                              <button
                                key={option.value}
                                onClick={() => handlePresetClick(option.value)}
                                className="w-full px-4 py-2 text-left text-white/90 hover:text-white hover:bg-white/10 transition text-sm font-medium"
                              >
                                {option.label}
                              </button>
                            ))}
                            <button
                              onClick={handleCustomClick}
                              className="w-full px-4 py-2 text-left text-white/90 hover:text-white hover:bg-white/10 transition text-sm font-medium border-t border-white/10 mt-1"
                            >
                              Custom...
                            </button>
                          </div>
                        )}
                      </div>
            )}
            {/* Info Popup - below D label and I button */}
            {(showInfoPopup || infoPopupPersistent) && stockInfo.ticker && (
              <div
                ref={infoPopupRef}
                className="absolute z-40 bg-black/95 backdrop-blur-md rounded-md border border-white/30 shadow-2xl overflow-hidden"
                style={{
                  top: 'calc(0.5rem + 2.5rem + 2.5rem)', // Below D label (0.5rem top-2) + D label height (2.5rem) + gap + I button height (2.5rem)
                  left: '0.5rem',
                }}
              >
                <div className="px-2.5 py-1.5 sm:px-3 sm:py-2">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="text-white/90 text-sm sm:text-base font-medium whitespace-nowrap">
                      {stockInfo.ticker}
                    </div>
                    {stockInfo.breakoutDate && (
                      <div className="text-white/70 text-xs sm:text-sm whitespace-nowrap">
                        {stockInfo.breakoutDate}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* Only blur if time is up AND tutorial is not active */}
            <div 
              className={`absolute inset-0 rounded-md overflow-hidden ${isTimeUp ? 'filter blur-sm' : ''} relative transition-opacity duration-500 ease-in-out`} 
              style={{ height: '100%', width: '100%' }}
            >
              {/* Combined chart display - always shows D data, adds after data progressively when available */}
              {orderedFiles && orderedFiles.length > 0 && orderedFiles[0]?.data ? (
                <div data-tutorial-chart className="absolute inset-0 transition-opacity duration-500 ease-in-out" style={{ opacity: 1 }}>
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
                    timerRightEdge={timerRightEdge}
                    timerLeftEdge={timerLeftEdge}
                    dLabelRightEdge={dLabelRightEdge}
                    dLabelCenterY={dLabelCenterY}
                  />
                  {/* Magnifying glass tool - properly integrated */}
                  {onChartClick && !disabled && score === null && !isTimeUp && (
                    <ChartMagnifier
                      onSelection={(syntheticEvent) => {
                        console.log('[ChartSection] onSelection called with:', syntheticEvent);
                        // Use the exposed handleChartClick method from StockChart
                        // This works on both simulated and real mobile devices
                        if (chartRef.current && chartRef.current.handleChartClick) {
                          try {
                            console.log('[ChartSection] Calling handleChartClick directly via ref');
                            // Create event-like object with clientX/clientY
                            const event = {
                              clientX: syntheticEvent.clientX,
                              clientY: syntheticEvent.clientY,
                              preventDefault: () => {},
                              stopPropagation: () => {},
                            };
                            chartRef.current.handleChartClick(event);
                            console.log('[ChartSection] handleChartClick called successfully');
                          } catch (error) {
                            console.error('[ChartSection] Error calling handleChartClick:', error);
                          }
                        } else {
                          console.warn('[ChartSection] chartRef.current or handleChartClick not available');
                          // Fallback: Try to find SVG and dispatch event
                          if (chartRef.current) {
                            const svgElement = chartRef.current.querySelector('svg');
                            if (svgElement) {
                              try {
                                const clickEvent = new MouseEvent('click', {
                                  bubbles: false,
                                  cancelable: false,
                                  composed: true,
                                  view: window,
                                  clientX: syntheticEvent.clientX,
                                  clientY: syntheticEvent.clientY,
                                });
                                svgElement.dispatchEvent(clickEvent);
                                console.log('[ChartSection] Fallback: dispatched click event');
                              } catch (fallbackError) {
                                console.error('[ChartSection] Fallback also failed:', fallbackError);
                              }
                            }
                          }
                        }
                      }}
                      enabled={!disabled && score === null && !isTimeUp}
                      chartElement={chartRef.current || null}
                      mainDataLength={orderedFiles && orderedFiles[0]?.data ? orderedFiles[0].data.length : 0}
                    />
                  )}
                  {/* Score overlay - appears after selection */}
                  {score !== null && feedback && (
                    <div data-tutorial-results>
                      <ChartScoreOverlay 
                        score={score}
                        accuracyTier={getAccuracyTier(score)}
                        show={true}
                        onNext={onNextCard}
                        isMobile={isMobile}
                        alwaysPaused={timerDuration === 0}
                        onPauseChange={handlePauseChange}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-black rounded-md transition-opacity duration-500 ease-in-out" style={{ opacity: 1 }}>
                  {/* Loading skeleton - smooth fade */}
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-white/50 text-sm">Loading chart...</div>
                  </div>
                </div>
              )}
            </div>
            {isTimeUp && score === null && (
              <SelectionTooltip
                show={true}
                onDismiss={(event) => onDismissTooltip?.(event)}
                style={{
                  top: isMobile ? '12px' : '18px',
                  right: isMobile ? '12px' : '18px',
                  maxWidth: isMobile ? '200px' : '240px',
                }}
                durationSeconds={timerDuration}
              />
            )}
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


