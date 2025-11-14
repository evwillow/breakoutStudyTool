/**
 * @fileoverview Main drill container coordinating charts, timers, overlays, and interaction logic.
 * @module src/web/components/ChartSection/ChartSection.tsx
 * @dependencies React, ../StockChart, components, hooks
 */
"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import StockChart from "../StockChart";
import { AuthModal } from "../Auth";
import { getAccuracyTier } from "../Flashcards/utils/coordinateUtils";
import ChartScoreOverlay from "./components/ChartScoreOverlay";
import TimerDisplay from "./components/TimerDisplay";
import InteractionLayer from "./components/InteractionLayer";
import { useChartTimer } from "./hooks/useChartTimer";
import { useChartInteraction } from "./hooks/useChartInteraction";
import { useScoreCalculation } from "./hooks/useScoreCalculation";
import type { ChartSectionProps, StockInfo, PopupPosition } from './ChartSection.types';

const ChartSection: React.FC<ChartSectionProps> = ({
  orderedFiles: rawOrderedFiles,
  afterData,
  timer,
  pointsTextArray = [],
  actionButtons,
  selectedButtonIndex,
  feedback,
  onButtonClick,
  disabled,
  isTimeUp,
  onAfterEffectComplete,
  onChartClick = null,
  userSelection = null,
  distance = null,
  score = null,
  targetPoint = null,
  onNextCard = null,
  timerDuration = null,
  onTimerDurationChange = null,
  onPauseStateChange = null,
  onDismissTooltip = null,
  onTimerPause = null,
}) => {
  // Normalize orderedFiles to always be an array
  const orderedFiles = useMemo(() => {
    if (!rawOrderedFiles) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[ChartSection] orderedFiles is null/undefined, normalizing to empty array');
      }
      return [];
    }
    if (!Array.isArray(rawOrderedFiles)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[ChartSection] orderedFiles is not an array, normalizing', {
          type: typeof rawOrderedFiles,
          value: rawOrderedFiles,
        });
      }
      return [];
    }
    return rawOrderedFiles;
  }, [rawOrderedFiles]);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [showInfoPopup, setShowInfoPopup] = useState<boolean>(false);
  const [infoPopupPersistent, setInfoPopupPersistent] = useState<boolean>(false);
  const dLabelRef = useRef<HTMLDivElement>(null);
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const infoPopupRef = useRef<HTMLDivElement>(null);
  const [timerRightEdge, setTimerRightEdge] = useState<number | null>(null);
  const [timerLeftEdge, setTimerLeftEdge] = useState<number | null>(null);
  const [dLabelRightEdge, setDLabelRightEdge] = useState<number | null>(null);
  const [dLabelCenterY, setDLabelCenterY] = useState<number | null>(null);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = (): void => {
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
    const calculateEdges = (): void => {
      const chartContainer = document.querySelector('.rounded-md');
      if (!chartContainer) return;
      
      const chartRect = chartContainer.getBoundingClientRect();
      const svg = chartContainer.querySelector('svg');
      if (!svg) return;
      
      const svgRect = svg.getBoundingClientRect();
      
      if (dLabelRef.current) {
        const dRect = dLabelRef.current.getBoundingClientRect();
        const dRightRelative = dRect.right - svgRect.left;
        const dCenterY = dRect.top + (dRect.height / 2) - svgRect.top;
        setDLabelRightEdge(dRightRelative);
        setDLabelCenterY(dCenterY);
      }
    };

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

  // Extract stock info
  const stockInfo = useMemo<StockInfo>(() => {
    if (!orderedFiles || orderedFiles.length === 0 || !orderedFiles[0]?.fileName) {
      return { ticker: null, breakoutDate: null };
    }
    
    const fileName = orderedFiles[0].fileName;
    const parts = fileName.split('/');
    const directoryName = parts[0] || fileName;
    
    const underscoreIndex = directoryName.indexOf('_');
    if (underscoreIndex === -1) {
      return { ticker: directoryName, breakoutDate: null };
    }
    
    const ticker = directoryName.substring(0, underscoreIndex);
    const datePart = directoryName.substring(underscoreIndex + 1);
    
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

  // Hooks
  const scoreCalculation = useScoreCalculation({
    feedback,
    afterData,
    isMobile,
    onAfterEffectComplete,
    onTimerPause,
  });

  const interaction = useChartInteraction({
    orderedFiles,
    afterData,
    onChartClick,
    disabled,
    score,
    isTimeUp,
  });

  const handlePauseChange = (paused: boolean): void => {
    scoreCalculation.handlePauseChange(paused);
    if (onPauseStateChange) {
      onPauseStateChange(paused);
    }
  };

  const handleChartAreaClickCapture = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (isTimeUp && score === null) {
      event.stopPropagation();
      event.preventDefault();
      if (onDismissTooltip) {
        onDismissTooltip({ reason: 'manual-chart' });
      }
    }
  };

  // Close info popup when clicking outside (unless persistent)
  useEffect(() => {
    if (!showInfoPopup || infoPopupPersistent) {
      return;
    }

    const handleClickOutside = (event: MouseEvent): void => {
      if (
        infoPopupRef.current &&
        event.target instanceof Node &&
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

  const chartContainerClasses = `w-full relative rounded-md overflow-hidden shadow-lg bg-black border border-white/30 transition-all duration-300`;

  return (
    <>
      <div className="flex flex-col pt-1 sm:pt-2 lg:pt-2 px-1 sm:px-6 md:px-10 lg:pr-2 gap-4 items-start w-full">
        <div className="w-full flex flex-col items-start bg-transparent rounded-md shadow-md p-0 py-1 lg:py-0">
          <div
            className={chartContainerClasses}
            style={{ 
              width: '100%', 
              height: isMobile ? '500px' : '600px',
              minHeight: isMobile ? '500px' : '600px',
              maxHeight: isMobile ? '500px' : '600px',
              margin: 0, 
              padding: 0, 
              boxSizing: 'border-box', 
              overflow: 'hidden' 
            }}
            onClickCapture={handleChartAreaClickCapture}
          >
            <TimerDisplay
              timer={timer}
              timerDuration={timerDuration}
              onTimerDurationChange={onTimerDurationChange}
              isMobile={isMobile}
              orderedFiles={orderedFiles}
              dLabelRef={dLabelRef}
              infoButtonRef={infoButtonRef}
              infoPopupRef={infoPopupRef}
              showInfoPopup={showInfoPopup}
              infoPopupPersistent={infoPopupPersistent}
              onInfoPopupToggle={(persistent, show) => {
                setInfoPopupPersistent(persistent);
                setShowInfoPopup(show);
              }}
              stockInfo={stockInfo}
            />

            <div 
              className={`absolute inset-0 rounded-md overflow-hidden ${isTimeUp ? 'filter blur-sm' : ''} relative transition-opacity duration-500 ease-in-out`} 
              style={{ height: '100%', width: '100%' }}
            >
              {(() => {
                // Validate chart data more thoroughly
                // orderedFiles is already normalized to an array above
                const hasOrderedFiles = orderedFiles.length > 0;
                const firstFile = hasOrderedFiles ? orderedFiles[0] : null;
                const hasData = firstFile && firstFile.data !== null && firstFile.data !== undefined;
                const isDataArray = hasData && Array.isArray(firstFile.data);
                const hasValidData = isDataArray && (firstFile.data as unknown[]).length > 0;

                // Enhanced debugging
                if (process.env.NODE_ENV === 'development') {
                  console.log('ChartSection: Chart data validation', {
                    hasOrderedFiles,
                    orderedFilesLength: orderedFiles?.length,
                    firstFileName: firstFile?.fileName,
                    hasData,
                    isDataArray,
                    hasValidData,
                    dataType: typeof firstFile?.data,
                    dataLength: Array.isArray(firstFile?.data) ? firstFile.data.length : 'N/A',
                    firstDataPoint: Array.isArray(firstFile?.data) && firstFile.data.length > 0 ? firstFile.data[0] : null,
                  });
                }

                if (!hasValidData) {
                  // Try to normalize the data if it exists but isn't in the expected format
                  if (hasData && firstFile.data && !isDataArray) {
                    // Attempt to extract array from object structure
                    const normalizedData = (() => {
                      const data = firstFile.data;
                      if (typeof data === 'object' && data !== null) {
                        if ('value' in data && Array.isArray((data as { value: unknown[] }).value)) {
                          return (data as { value: unknown[] }).value;
                        }
                        if ('data' in data && Array.isArray((data as { data: unknown[] }).data)) {
                          return (data as { data: unknown[] }).data;
                        }
                        const values = Object.values(data);
                        if (values.length > 0 && Array.isArray(values[0])) {
                          return values[0];
                        }
                      }
                      return null;
                    })();

                    if (normalizedData && Array.isArray(normalizedData) && normalizedData.length > 0) {
                      // Data was successfully normalized, use it
                      if (process.env.NODE_ENV === 'development') {
                        console.log('[ChartSection] Data normalized successfully', {
                          originalType: typeof firstFile.data,
                          normalizedLength: normalizedData.length,
                        });
                      }
                      return (
                        <div data-tutorial-chart className="absolute inset-0 transition-opacity duration-500 ease-in-out" style={{ opacity: 1 }}>
                          <StockChart 
                            data={normalizedData} 
                            afterData={afterData}
                            showAfterAnimation={scoreCalculation.showAfterAnimation}
                            progressPercentage={scoreCalculation.progressPercentage}
                            zoomPercentage={scoreCalculation.zoomPercentage}
                            isInDelayPhase={scoreCalculation.completionDelay}
                            afterAnimationComplete={scoreCalculation.afterAnimationComplete}
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
                          
                          <InteractionLayer
                            interaction={interaction}
                            onChartClick={onChartClick}
                            disabled={disabled}
                            score={score}
                            isTimeUp={isTimeUp}
                            orderedFiles={orderedFiles}
                            onDismissTooltip={onDismissTooltip}
                            timerDuration={timerDuration}
                            isMobile={isMobile}
                          />
                        </div>
                      );
                    }
                  }

                  return (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-white/70 text-sm">
                        {!hasOrderedFiles ? 'No files loaded' : 
                         !hasData ? 'File data missing' :
                         !isDataArray ? 'Data is not an array' :
                         'Loading chart data...'}
                      </div>
                    </div>
                  );
                }

                return (
                  <div data-tutorial-chart className="absolute inset-0 transition-opacity duration-500 ease-in-out" style={{ opacity: 1 }}>
                    <StockChart 
                      data={firstFile.data} 
                      afterData={afterData}
                      showAfterAnimation={scoreCalculation.showAfterAnimation}
                      progressPercentage={scoreCalculation.progressPercentage}
                      zoomPercentage={scoreCalculation.zoomPercentage}
                      isInDelayPhase={scoreCalculation.completionDelay}
                      afterAnimationComplete={scoreCalculation.afterAnimationComplete}
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
                    
                    <InteractionLayer
                      interaction={interaction}
                      onChartClick={onChartClick}
                      disabled={disabled}
                      score={score}
                      isTimeUp={isTimeUp}
                      orderedFiles={orderedFiles}
                      onDismissTooltip={onDismissTooltip}
                      timerDuration={timerDuration}
                      isMobile={isMobile}
                    />
                  </div>
                );
              })()}
              
              {score !== null && feedback && (
                <div data-tutorial-results>
                  <ChartScoreOverlay 
                    score={score}
                    accuracyTier={getAccuracyTier(score).tier}
                    show={true}
                    onNext={onNextCard}
                    isMobile={isMobile}
                    alwaysPaused={timerDuration === 0}
                    onPauseChange={handlePauseChange}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {showAuthModal && <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />}
    </>
  );
}

export default React.memo<ChartSectionProps>(ChartSection, (prevProps: ChartSectionProps, nextProps: ChartSectionProps): boolean => {
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
  
  return pointsEqual && otherPropsEqual;
});
