/**
 * ChartSection.js
 * 
 * Component for displaying stock charts in a responsive layout.
 * Features:
 * - Responsive design with different layouts for mobile and desktop
 * - Displays daily and hourly charts in an organized grid
 * - Shows timer and authentication controls
 * - Optimized with React.memo for performance
 * - Clean, borderless design with soft backgrounds for reduced eye strain
 */
import React, { useState, useEffect, useRef } from "react";
import StockChart from "./StockChart";
import AuthModal from "./AuthModal";
import ActionButtonsRow from "./ActionButtonsRow";

const ChartSection = React.memo(function ChartSection({
  orderedFiles,
  afterData,
  timer,
  pointsTextArray,
  actionButtons,
  selectedButtonIndex,
  feedback,
  onButtonClick,
  disabled,
  isTimeUp,
}) {
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [showAfterAnimation, setShowAfterAnimation] = useState(false);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [zoomPercentage, setZoomPercentage] = useState(0);
  const [completionDelay, setCompletionDelay] = useState(false);
  const [afterAnimationComplete, setAfterAnimationComplete] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const delayTimerRef = useRef(null);
  const delayStartTimeRef = useRef(null);
  const debugIntervalRef = useRef(null);

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

  // Handle zoom animation and data reveal
  useEffect(() => {
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
      setShowAfterAnimation(false);
      setProgressPercentage(0);
      setZoomPercentage(0);
      setCompletionDelay(false);
      setAfterAnimationComplete(false);
      return;
    }

    console.log("Animation sequence starting...");
    
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
            
            resolve();
          }, 5000); // GUARANTEED EXACTLY 5000ms (5 seconds) delay
        });
      } catch (error) {
        console.error("Animation sequence error:", error);
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
    };
  }, [afterData, isMobile]);

  // Timer color based on remaining time
  const getTimerColor = () => {
    if (timer <= 10) return "text-red-600";
    if (timer <= 30) return "text-yellow-600";
    return "text-turquoise-600";
  };

  return (
    <>
      {/* Authentication and timer controls for mobile view */}
      <div className="md:hidden w-full flex justify-between items-center px-3 py-2 bg-transparent shadow-sm">
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-2 text-turquoise-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <h2 className={`text-2xl font-bold ${getTimerColor()} bg-black px-3 py-1 rounded-md`}>
            {timer}s
          </h2>
        </div>
      </div>
      
      {/* Main content with Daily and Hourly charts */}
      <div className="flex flex-col pt-2 sm:pt-4 md:pt-8 px-2 sm:px-6 md:px-10 lg:flex-row gap-4 items-center lg:items-start">
        {/* Daily chart section - primary chart */}
        <div className="w-full lg:w-3/5 flex flex-col items-center bg-transparent rounded-lg shadow-md p-3 md:p-4">
          <div className="w-full text-center hidden md:block mb-2">
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2 text-turquoise-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <h2 className={`text-xl font-bold ${getTimerColor()} bg-black px-3 py-1 rounded-md`}>
                Timer: {timer}s
              </h2>
            </div>
          </div>
          <div className="w-full mt-1 sm:mt-2 relative aspect-square rounded-xl overflow-hidden shadow-lg bg-black border border-white p-1">
            {/* D Label - positioned in the top left corner */}
            <div className="absolute top-0 left-0 text-white font-bold z-10 bg-gradient-turquoise px-2 py-1 rounded-br-md">
              D
            </div>
            <div className={`absolute inset-0 rounded-lg overflow-hidden ${isTimeUp ? 'filter blur-xl' : ''}`}>
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
              />
            </div>
          </div>
        </div>

        {/* Right Column: H Chart + Points Grid */}
        <div className="w-full lg:w-2/5 flex flex-col gap-4">
          {/* H Chart */}
          <div className="w-full flex flex-col items-center bg-transparent rounded-lg shadow-md p-3">
            <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-lg bg-black border border-white p-1">
              {/* H Label - positioned in the top left corner */}
              <div className="absolute top-0 left-0 text-white font-bold z-10 bg-gradient-to-r from-turquoise-700 to-turquoise-600 px-2 py-1 rounded-br-md">
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
          
          {/* Points Grid - Responsive across all screen sizes */}
          <div className={`grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 px-1 sm:px-0 bg-transparent rounded-lg shadow-md p-3 ${isTimeUp ? 'filter blur-xl' : ''}`}>
            {pointsTextArray.map((text, index) => (
              <div
                key={index}
                className={`rounded-md shadow-sm p-2 text-center text-xs md:text-sm flex items-center justify-center min-h-[2rem] transition-all duration-200 ${
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
