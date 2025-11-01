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
import ChartScoreOverlay from "../UI/ChartScoreOverlay";
import ChartMagnifier from "../UI/ChartMagnifier";
import { getAccuracyTier } from "../Flashcards/utils/coordinateUtils";

const ChartSection = React.memo(function ChartSection({
  orderedFiles,
  afterData,
  timer,
  pointsTextArray,
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
    console.log("afterData type:", typeof afterData);
    console.log("afterData value:", afterData);
    console.log("afterData is null:", afterData === null);
    console.log("afterData is undefined:", afterData === undefined);
    console.log("afterData is falsy:", !afterData);
    console.log("feedback state:", feedback);
    console.log("last feedback processed:", lastFeedbackRef.current);
    
    // Only start animation if user has made a selection (feedback is set)
    if (!feedback) {
      console.log("No feedback yet - waiting for user selection");
      lastFeedbackRef.current = null; // Reset when feedback is cleared
      return;
    }
    
    // Prevent duplicate animations for the same feedback state
    if (lastFeedbackRef.current === feedback) {
      console.log("Already processed this feedback state, skipping animation");
      return;
    }
    
    // Mark this feedback as processed
    lastFeedbackRef.current = feedback;
    console.log("Processing new feedback state:", feedback);
    
    // Clear any existing timers
    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
    if (debugIntervalRef.current) {
      clearInterval(debugIntervalRef.current);
      debugIntervalRef.current = null;
    }

    // Reset animation states when afterData is removed
    if (!afterData) {
      console.log("No afterData - starting animation sequence without after data");
      setShowAfterAnimation(false);
      setProgressPercentage(0);
      setZoomPercentage(0);
      setCompletionDelay(false);
      setAfterAnimationComplete(false);
      
      // Start animation sequence even without after data to maintain timing and button disabling
      if (!animationInProgress) {
        setAnimationInProgress(true);
        
        // Run a simplified animation sequence for no after data
        const runNoAfterDataSequence = async () => {
          try {
            // Initial 1.5-second delay before any animation starts
            // This gives the user time to see the correct answer feedback
            await new Promise(resolve => {
              console.log("Initial 1.5-second delay started (no after data)");
              setTimeout(() => {
                console.log("Initial delay completed (no after data)");
                resolve();
              }, 1500); // 1.5-second initial delay
            });
            
            // Set completion state
            setAfterAnimationComplete(true);
            
            // 5-second observation delay (same as with after data)
            console.log("Starting 5-second observation delay (no after data)");
            setCompletionDelay(true);
            
            await new Promise(resolve => {
              setTimeout(() => {
                console.log("Observation delay completed (no after data)");
                setCompletionDelay(false);
                resolve();
              }, 5000); // 5-second delay
            });
            
            // Call the completion callback
            if (onAfterEffectComplete) {
              console.log("Calling onAfterEffectComplete (no after data)");
              onAfterEffectComplete();
            }
            
            setAnimationInProgress(false);
          } catch (error) {
            console.error("No after data animation sequence error:", error);
            setAnimationInProgress(false);
          }
        };
        
        runNoAfterDataSequence();
      }
      return;
    }

    // Prevent multiple animations from starting simultaneously
    if (animationInProgress) {
      console.log("Animation already in progress, ignoring new trigger");
      return;
    }

    console.log("Animation sequence starting...");
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
        
        // Set the visual state to complete first
        setProgressPercentage(100);
        setAfterAnimationComplete(true);
        
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
        <div className="w-full lg:w-3/5 flex flex-col items-center bg-transparent rounded-lg shadow-md p-2 sm:p-3 md:p-4">
          {/* Timer - visible on mobile too */}
          <div className="w-full text-center mb-2 sm:mb-3">
            <div className="flex items-center justify-center">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-turquoise-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <h2 className={`text-base sm:text-lg md:text-xl font-bold ${getTimerColor()} bg-black px-2 sm:px-3 py-1 rounded-md`}>
                {timer}s
              </h2>
            </div>
          </div>
          <div className="w-full relative aspect-square rounded-xl overflow-hidden shadow-lg bg-black border border-white p-0.5 sm:p-1 transition-all duration-300">
            {/* D Label - positioned in the top left corner */}
            <div className="absolute top-0 left-0 text-white font-bold z-10 bg-gradient-turquoise px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-br-md text-xs sm:text-sm">
              D
            </div>
            <div className={`absolute inset-0 rounded-lg overflow-hidden ${isTimeUp ? 'filter blur-xl' : ''} relative transition-opacity duration-300`}>
              {/* Combined chart display - always shows D data, adds after data progressively when available */}
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
                disabled={disabled}
              />
              {/* Magnifying glass tool - simplified integration */}
              {onChartClick && !disabled && score === null && (
                <ChartMagnifier
                  onSelection={(syntheticEvent) => {
                    // Trigger chart click directly using the SVG element
                    const chartContainer = chartRef.current;
                    if (chartContainer) {
                      const svgElement = chartContainer.querySelector('svg');
                      if (svgElement && svgElement.onclick) {
                        svgElement.onclick(syntheticEvent);
                      } else {
                        // Fallback: dispatch a click event
                        const clickEvent = new MouseEvent('click', {
                          clientX: syntheticEvent.clientX,
                          clientY: syntheticEvent.clientY,
                          bubbles: true,
                          cancelable: true,
                        });
                        svgElement?.dispatchEvent(clickEvent);
                      }
                    }
                  }}
                  enabled={!disabled && score === null}
                  chartElement={chartRef.current?.querySelector('svg') || null}
                />
              )}
              {/* Score overlay - appears after selection */}
              {score !== null && feedback && (
                <ChartScoreOverlay 
                  score={score}
                  accuracyTier={getAccuracyTier(score)}
                  show={true}
                  onNext={onNextCard}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Column: H Chart + Points Grid - Hidden on mobile for cleaner UI */}
        <div className="hidden lg:flex w-full lg:w-2/5 flex-col gap-3 sm:gap-4">
          {/* H Chart */}
          <div className="w-full flex flex-col items-center bg-transparent rounded-lg shadow-md p-2 sm:p-3">
            <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-lg bg-black border border-white p-1">
              {/* H Label - positioned in the top left corner */}
              <div className="absolute top-0 left-0 text-white font-bold z-10 bg-gradient-to-r from-turquoise-700 to-turquoise-600 px-2 py-1 rounded-br-md text-xs sm:text-sm">
                H
              </div>
              <div className={`absolute inset-0 rounded-lg overflow-hidden ${isTimeUp ? 'filter blur-xl' : ''}`}>
                <StockChart 
                  data={orderedFiles[1].data}
                  backgroundColor="black" 
                  showSMA={true} 
                  chartType="hourly"
                  forceShowSMA={true}
                />
              </div>
            </div>
          </div>
          
          {/* Points Grid - Compact on mobile, full grid on desktop */}
          <div className={`grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 bg-transparent rounded-lg shadow-md p-2 sm:p-3 ${isTimeUp ? 'filter blur-xl' : ''}`}>
            {pointsTextArray.map((text, index) => (
              <div
                key={index}
                className={`rounded-md shadow-sm p-2 text-center text-xs sm:text-sm flex items-center justify-center min-h-[2.5rem] transition-all duration-200 ${
                  text ? "bg-turquoise-600 text-white hover:bg-turquoise-700" : "invisible"
                }`}
              >
                {text || "\u00A0"}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
});

export default ChartSection;
