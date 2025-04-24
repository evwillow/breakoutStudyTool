/**
 * ChartSection.js
 * 
 * Component for displaying stock charts in a responsive layout.
 * Features:
 * - Responsive design with different layouts for mobile and desktop
 * - Displays multiple charts (daily, hourly, minute) in an organized grid
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
  const delayTimerRef = useRef(null);
  const delayStartTimeRef = useRef(null);
  const debugIntervalRef = useRef(null);

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

    console.log("Animation sequence started");
    
    // Simplified animation sequence with guaranteed 9-second delay
    const animate = async () => {
      try {
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
        
        // Step 3: Extended delay - now much longer (20 seconds)
        setCompletionDelay(true);
        delayStartTimeRef.current = Date.now();
        
        console.log(`EXTENDED DELAY STARTED at ${new Date().toISOString()} - Will last 20 seconds`);
        
        // Debug interval to track actual time elapsed
        debugIntervalRef.current = setInterval(() => {
          const elapsed = (Date.now() - delayStartTimeRef.current) / 1000;
          console.log(`DELAY RUNNING: ${elapsed.toFixed(1)} seconds elapsed of 20 seconds total`);
        }, 1000);
        
        // Wait exactly 20 seconds now for an extended delay
        await new Promise(resolve => {
          delayTimerRef.current = setTimeout(() => {
            const actualDelay = (Date.now() - delayStartTimeRef.current) / 1000;
            console.log(`EXTENDED DELAY ENDED after ${actualDelay.toFixed(1)} seconds`);
            
            if (debugIntervalRef.current) {
              clearInterval(debugIntervalRef.current);
              debugIntervalRef.current = null;
            }
            
            setCompletionDelay(false);
            resolve();
          }, 20000); // Increased to 20 seconds for a much longer delay
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
  }, [afterData]);

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
      
      <div className="flex flex-col pt-2 sm:pt-4 md:pt-8 px-2 sm:px-6 md:px-10 md:flex-row gap-3 md:gap-6 items-center md:items-start">
        {/* Daily chart section - primary chart */}
        <div className="w-full md:w-auto md:flex-1 flex flex-col items-center bg-transparent rounded-lg shadow-md p-3 md:p-4">
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

        {/* Right Column: Second & Third Charts + Points Grid */}
        <div className="flex flex-col w-full md:flex-1 gap-3 md:gap-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Second Chart */}
            <div className="w-full sm:w-3/5 flex flex-col items-center bg-transparent rounded-lg shadow-md p-3">
              <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-lg bg-black border-t border-l border-r border-white p-1" style={{ borderBottom: '0.5px solid white' }}>
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
            {/* Third Chart - Hidden on mobile */}
            <div className="hidden sm:flex sm:w-2/5 flex-col items-center sm:items-end bg-transparent rounded-lg shadow-md p-3">
              {showAuthModal && (
                <AuthModal
                  open={showAuthModal}
                  onClose={() => setShowAuthModal(false)}
                />
              )}
              <div className="w-full flex justify-center">
                <div className="w-full max-w-[300px] aspect-square relative rounded-xl overflow-hidden shadow-lg bg-black border border-white p-1">
                  {/* M Label - positioned in the top left corner */}
                  <div className="absolute top-0 left-0 text-white font-bold z-10 bg-gradient-to-r from-turquoise-700 to-turquoise-600 px-2 py-1 rounded-br-md">
                    M
                  </div>
                  <div className={`absolute inset-0 rounded-lg overflow-hidden ${isTimeUp ? 'filter blur-xl' : ''}`}>
                    <StockChart 
                      data={orderedFiles[2].data}
                      backgroundColor="black" 
                      chartType="minute"
                      showVolume={true}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Mobile-only: Minute Chart next to Points Text Blocks */}
          <div className="sm:hidden flex flex-row mt-2 gap-3">
            <div className="w-1/2 bg-transparent rounded-lg shadow-md p-3">
              <div className="w-full aspect-square relative rounded-xl overflow-hidden shadow-lg bg-black border border-white p-1">
                {/* M Label - positioned in the top left corner */}
                <div className="absolute top-0 left-0 text-white font-bold z-10 bg-gradient-to-r from-turquoise-500 to-turquoise-400 px-2 py-1 rounded-br-md">
                  M
                </div>
                <div className={`absolute inset-0 rounded-lg overflow-hidden ${isTimeUp ? 'filter blur-xl' : ''}`}>
                  <StockChart data={orderedFiles[2].data} backgroundColor="black" showSMA={true} chartType="minute" />
                </div>
              </div>
            </div>
            <div className="w-1/2 bg-transparent rounded-lg shadow-md p-3 flex items-center">
              <div className={`w-full flex flex-col gap-2 ${isTimeUp ? 'filter blur-xl' : ''}`}>
                {pointsTextArray.map((text, index) => (
                  <div
                    key={index}
                    className={`rounded-md shadow-sm p-2 text-center text-xs flex items-center justify-center min-h-[1.75rem] ${
                      text ? "bg-turquoise-600 text-white" : "invisible"
                    }`}
                  >
                    {text || "\u00A0"}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Points Grid - Hidden on mobile */}
          <div className={`hidden sm:grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 px-1 sm:px-0 bg-transparent rounded-lg shadow-md p-3 ${isTimeUp ? 'filter blur-xl' : ''}`}>
            {pointsTextArray.map((text, index) => (
              <div
                key={index}
                className={`rounded-md shadow-sm p-2 text-center text-sm flex items-center justify-center min-h-[2rem] transition-all duration-200 ${
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
