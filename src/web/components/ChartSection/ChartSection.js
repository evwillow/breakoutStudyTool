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
import React, { useState, useEffect, useRef, useMemo } from "react";
import StockChart from "../StockChart";
import { AuthModal } from "../Auth";
import ChartMagnifier from "../UI/ChartMagnifier";
import { getAccuracyTier } from "../Flashcards/utils/coordinateUtils";

// ChartScoreOverlay component - inlined to fix import issues
const ChartScoreOverlay = ({ score, accuracyTier, show, onNext, isMobile }) => {
  const [countdown, setCountdown] = useState(8);
  
  useEffect(() => {
    if (!show || score === null || score === undefined) {
      return;
    }
    
    // Reset countdown when popup appears
    setCountdown(8);
    
    // Countdown timer
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [show, score]);
  
  if (!show || score === null || score === undefined) {
    return null;
  }

  return (
    <div className={`absolute z-50 pointer-events-none ${
      isMobile 
        ? 'bottom-2 left-2 right-2' 
        : 'bottom-2 left-2 right-2'
    }`}>
      <div className={`bg-gradient-to-br from-gray-900 via-black to-gray-900 bg-opacity-98 backdrop-blur-lg border-2 border-turquoise-500/80 rounded-2xl shadow-2xl pointer-events-auto transform transition-all duration-300 animate-slide-in-up relative overflow-hidden w-full ${
        isMobile 
          ? 'px-5 py-4' 
          : 'px-8 py-4'
      }`}>
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-turquoise-500/10 via-transparent to-transparent pointer-events-none"></div>
        
        <div className={`relative z-10 ${isMobile ? 'text-center' : 'flex items-center gap-4'}`}>
          <div className={`flex items-center ${isMobile ? 'justify-center mb-3' : 'justify-center flex-shrink-0'}`}>
            <div className={`rounded-full bg-gradient-to-br from-turquoise-500 to-turquoise-600 flex items-center justify-center shadow-lg ring-4 ring-turquoise-500/20 ${
              isMobile ? 'w-12 h-12' : 'w-12 h-12'
            }`}>
              <svg className={`text-white ${isMobile ? 'w-6 h-6' : 'w-6 h-6'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
          <div className={`${isMobile ? '' : 'flex-1 flex items-center gap-4'}`}>
            <div className={isMobile ? 'mb-3' : 'flex-1'}>
              {isMobile && <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Score</p>}
              <div className={isMobile ? '' : 'flex items-baseline gap-3'}>
                <h3 className={`font-bold text-white tracking-tight ${isMobile ? 'text-3xl mb-1' : 'text-3xl'}`}>
                  {Math.round(score)}%
                </h3>
                {!isMobile && <span className="text-xs text-gray-400 uppercase tracking-widest">Score</span>}
              </div>
              {accuracyTier && (
                <p className={`font-semibold ${accuracyTier.color || 'text-turquoise-400'} ${isMobile ? 'text-sm mb-3 uppercase tracking-wider' : 'text-xs uppercase tracking-wider mt-1'}`}>
                  {accuracyTier.tier || 'Good'}
                </p>
              )}
            </div>
            <div className={isMobile ? 'border-t border-turquoise-500/20 pt-3' : 'flex items-center gap-3 flex-shrink-0'}>
              {isMobile ? (
                <>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <p className="text-xs text-gray-400">Next stock in</p>
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-turquoise-500/20 border border-turquoise-500/40">
                      <span className="text-sm font-bold text-turquoise-400">{countdown}</span>
                    </div>
                    <p className="text-xs text-gray-400">seconds</p>
                  </div>
                  {onNext && (
                    <button
                      onClick={onNext}
                      className="bg-gradient-to-r from-turquoise-600 to-turquoise-500 hover:from-turquoise-700 hover:to-turquoise-600 text-white px-5 py-2.5 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 text-sm w-full border border-turquoise-400/30"
                    >
                      Next Stock
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-400">Next in</p>
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-turquoise-500/20 border border-turquoise-500/40">
                      <span className="text-xs font-bold text-turquoise-400">{countdown}</span>
                    </div>
                    <p className="text-xs text-gray-400">s</p>
                  </div>
                  {onNext && (
                    <button
                      onClick={onNext}
                      className="bg-gradient-to-r from-turquoise-600 to-turquoise-500 hover:from-turquoise-700 hover:to-turquoise-600 text-white px-4 py-2 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 text-xs border border-turquoise-400/30 whitespace-nowrap"
                    >
                      Next Stock
                    </button>
                  )}
                </>
              )}
            </div>
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
}) {
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [showAfterAnimation, setShowAfterAnimation] = useState(false);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [zoomPercentage, setZoomPercentage] = useState(0);
  const [completionDelay, setCompletionDelay] = useState(false);
  const [afterAnimationComplete, setAfterAnimationComplete] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [animationInProgress, setAnimationInProgress] = useState(false);
  const delayTimerRef = useRef(null);
  const delayStartTimeRef = useRef(null);
  const debugIntervalRef = useRef(null);
  const lastFeedbackRef = useRef(null);
  const chartRef = useRef(null);

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
    
    return () => clearTimeout(timeout);
  }, [orderedFiles]);

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
        await new Promise(resolve => {
          console.log("Initial 1.5-second delay started");
          setTimeout(() => {
            console.log("Initial delay completed, beginning animation sequence");
            resolve();
          }, 1500); // 1.5-second initial delay
        });
        
        // Only run zoom and reveal animations if we have afterData
        if (afterData && Array.isArray(afterData) && afterData.length > 0) {
          // Step 1: Zoom animation
          await new Promise(resolve => {
            let startTime = performance.now();
            const zoomDuration = 1500; // 1.5 seconds
            
            const animateZoom = (timestamp) => {
              const elapsed = timestamp - startTime;
              const progress = Math.min(elapsed / zoomDuration, 1);
              const easedProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
              
              setZoomPercentage(easedProgress * 100);
              
              if (progress < 1) {
                requestAnimationFrame(animateZoom);
              } else {
                setZoomPercentage(100);
                resolve();
              }
            };
            
            requestAnimationFrame(animateZoom);
          });
          
          console.log("Zoom animation completed");
          
          // Step 2: Reveal animation
          setShowAfterAnimation(true);
          await new Promise(resolve => {
            let startTime = performance.now();
            const revealDuration = 1800; // 1.8 seconds
            
            const animateReveal = (timestamp) => {
              const elapsed = timestamp - startTime;
              const progress = Math.min(elapsed / revealDuration, 1);
              const easedProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
              
              setProgressPercentage(easedProgress * 100);
              
              if (progress < 1) {
                requestAnimationFrame(animateReveal);
              } else {
                setProgressPercentage(100);
                setAfterAnimationComplete(true);
                resolve();
              }
            };
            
            requestAnimationFrame(animateReveal);
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
        await new Promise(resolve => {
          console.log(`Observation delay started at ${new Date().toISOString()} - Will last EXACTLY 5 seconds`);
          
          // Set a fixed 5-second (5000ms) delay that starts NOW (after rendering is complete)
          delayTimerRef.current = setTimeout(() => {
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
          }, 5000); // GUARANTEED EXACTLY 5000ms (5 seconds) delay
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
  }, [orderedFiles]);

  // Timer color based on remaining time
  const getTimerColor = () => {
    if (timer <= 10) return "text-red-600";
    if (timer <= 30) return "text-yellow-600";
    return "text-turquoise-600";
  };

  return (
    <>
      {/* Main content with Daily and Hourly charts */}
      <div className="flex flex-col pt-2 sm:pt-4 md:pt-8 px-2 sm:px-6 md:px-10 lg:flex-row gap-4 items-center lg:items-start">
        {/* Daily chart section - primary chart */}
        <div className="w-full lg:w-3/5 flex flex-col items-center bg-transparent rounded-lg shadow-md p-0 sm:p-3 md:p-4">
          {/* Timer - visible on mobile too */}
          <div className="w-full text-center -mt-3 sm:mt-0 sm:mb-3">
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-turquoise-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <h2 className={`text-xl sm:text-2xl md:text-3xl font-bold ${getTimerColor()} bg-black px-3 sm:px-4 py-2 sm:py-1.5 rounded-md`}>
                {timer}s
              </h2>
            </div>
          </div>
          <div className="w-full relative rounded-xl overflow-hidden shadow-lg bg-black border border-white p-0.5 sm:p-1 transition-all duration-300" style={{ width: '100%', aspectRatio: isMobile ? 'auto' : '1 / 1', minHeight: isMobile ? '500px' : 'auto', maxHeight: isMobile ? '800px' : 'none', margin: 0, padding: 0, boxSizing: 'border-box' }}>
            {/* D Label - positioned in the top left, above magnifying glass */}
            <div className="absolute top-2 left-2 text-white font-bold z-30 bg-gradient-turquoise px-3 sm:px-2 py-1.5 sm:py-1 rounded-md text-lg sm:text-base shadow-lg">
              D
            </div>
            <div className={`absolute inset-0 rounded-lg overflow-hidden ${isTimeUp ? 'filter blur-xl' : ''} relative transition-opacity duration-300`} style={{ height: '100%' }}>
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
                        // The syntheticEvent has viewport coordinates (clientX/clientY)
                        // Create a proper MouseEvent that the StockChart can handle
                        if (chartRef.current) {
                          const svgElement = chartRef.current.querySelector('svg');
                          if (svgElement) {
                            // Create and dispatch a proper click event at the viewport coordinates
                            // The StockChart's handleChartClick will use getBoundingClientRect to convert
                            const clickEvent = new MouseEvent('click', {
                              clientX: syntheticEvent.clientX,
                              clientY: syntheticEvent.clientY,
                              bubbles: true,
                              cancelable: true,
                              view: window,
                              button: 0,
                              buttons: 1,
                            });
                            svgElement.dispatchEvent(clickEvent);
                          }
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
        <div className="flex w-full lg:w-2/5 flex-col gap-3 sm:gap-4">
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
          
          {/* Points Grid - Compact on mobile, full grid on desktop */}
          <div className={`grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 bg-transparent rounded-lg shadow-md p-2 sm:p-3 ${isTimeUp ? 'filter blur-xl' : ''}`}>
            {(() => {
              // Ensure we have a valid array - handle undefined/null gracefully
              const safePointsArray = Array.isArray(pointsTextArray) ? pointsTextArray : (pointsTextArray ? [pointsTextArray] : []);
              
              if (safePointsArray.length > 0) {
                return safePointsArray.map((text, index) => {
                  const displayText = text && typeof text === 'string' ? text.trim() : '';
                  return (
                    <div
                      key={`point-${index}-${displayText || index}`}
                      className={`rounded-md shadow-sm p-2 text-center text-xs sm:text-sm flex items-center justify-center min-h-[2.5rem] transition-all duration-200 ${
                        displayText ? "bg-turquoise-600 text-white hover:bg-turquoise-700" : "invisible"
                      }`}
                    >
                      {displayText || "\u00A0"}
                    </div>
                  );
                });
              } else {
                // Show placeholder boxes when no points data is available
                return Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={`placeholder-${index}`}
                    className="rounded-md shadow-sm p-2 text-center text-xs sm:text-sm flex items-center justify-center min-h-[2.5rem] transition-all duration-200 invisible"
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
