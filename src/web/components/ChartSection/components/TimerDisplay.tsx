/**
 * @fileoverview Timer display component with duration selector popup.
 * @module src/web/components/ChartSection/components/TimerDisplay.tsx
 * @dependencies React, ../hooks/useChartTimer, ../ChartSection.types
 */
"use client";

import React from "react";
import { useChartTimer } from "../hooks/useChartTimer";
import type { OrderedFile, StockInfo } from "../ChartSection.types";

export interface TimerDisplayProps {
  timer: number | null | undefined;
  timerDuration: number | null;
  onTimerDurationChange?: ((duration: number) => void) | null;
  isMobile: boolean;
  orderedFiles: OrderedFile[] | null | undefined;
  dLabelRef: React.RefObject<HTMLDivElement>;
  infoButtonRef: React.RefObject<HTMLButtonElement>;
  infoPopupRef: React.RefObject<HTMLDivElement>;
  showInfoPopup: boolean;
  infoPopupPersistent: boolean;
  onInfoPopupToggle: (persistent: boolean, show: boolean) => void;
  stockInfo: StockInfo;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  timer,
  timerDuration,
  onTimerDurationChange,
  isMobile,
  orderedFiles,
  dLabelRef,
  infoButtonRef,
  infoPopupRef,
  showInfoPopup,
  infoPopupPersistent,
  onInfoPopupToggle,
  stockInfo,
}) => {
  const timerHook = useChartTimer({
    timer,
    timerDuration,
    onTimerDurationChange,
    isMobile,
  });

  return (
    <>
      <div className="absolute top-2 left-2 z-30 flex items-start gap-2 sm:gap-3">
        <div className="flex flex-col gap-1 items-center">
          <div ref={dLabelRef} className="text-white font-semibold bg-black/40 backdrop-blur-sm px-3 sm:px-2 py-1.5 sm:py-1 rounded-md text-lg sm:text-base border border-white/30 shadow-lg">
            D
          </div>
          <button
            ref={infoButtonRef}
            onClick={(e) => {
              e.stopPropagation();
              const newPersistent = !infoPopupPersistent;
              onInfoPopupToggle(newPersistent, newPersistent || !showInfoPopup);
            }}
            className={`inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-md transition-colors ${
              infoPopupPersistent ? 'text-white/70' : 'text-white/70 hover:text-white/90'
            }`}
            title="Stock Information"
          >
            <svg className="w-6 h-6 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </button>
        </div>
        {/* SMA Labels */}
        <div className="inline-flex flex-col gap-0.5 bg-black/40 backdrop-blur-sm px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-md border border-white/30 shadow-lg">
          <div className="flex items-center gap-1.5">
            <div className="w-[18px] h-[2.5px] rounded-md" style={{ backgroundColor: '#00D4FF' }}></div>
            <span className="text-xs sm:text-sm text-white/90 font-medium whitespace-nowrap">10 SMA</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-[18px] h-[2.5px] rounded-md" style={{ backgroundColor: '#7C3AED' }}></div>
            <span className="text-xs sm:text-sm text-white/90 font-medium whitespace-nowrap">20 SMA</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-[18px] h-[2.5px] rounded-md" style={{ backgroundColor: '#F59E0B' }}></div>
            <span className="text-xs sm:text-sm text-white/90 font-medium whitespace-nowrap">50 SMA</span>
          </div>
        </div>
        <div ref={timerHook.timerContainerRef} className="relative inline-flex items-center gap-1.5 sm:gap-2">
          <div data-tutorial-timer className="inline-flex items-center gap-1.5 bg-black/40 backdrop-blur-sm pl-2.5 pr-3 sm:pl-3 sm:pr-3 py-1.5 sm:py-1 rounded-md border border-white/30 shadow-lg">
            <svg className="w-4 h-4 sm:w-4 sm:h-4 text-white/70 -ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span className={`text-base sm:text-lg font-semibold font-mono ${timerHook.getTimerColor()}`}>
              {timer}s
            </span>
          </div>
          {onTimerDurationChange && (
            <button
              ref={timerHook.timerTriggerRef}
              data-tutorial-timer-duration
              data-timer-trigger
              onClick={(e) => {
                e.stopPropagation();
                timerHook.setShowTimerPopup(!timerHook.showTimerPopup);
              }}
              className="inline-flex items-center justify-center w-5 h-5 sm:w-5 sm:h-5 text-white hover:text-white/80 transition-colors cursor-pointer"
              aria-label="Timer duration options"
            >
              <svg className={`w-4 h-4 sm:w-4 sm:h-4 transition-transform ${timerHook.showTimerPopup ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {/* Timer Popup */}
      {timerHook.showTimerPopup && (
        <div
          ref={timerHook.timerPopupRef}
          className="absolute z-[100] bg-black/95 backdrop-blur-md rounded-md border border-white/30 shadow-2xl overflow-hidden"
          style={{
            top: timerHook.popupPosition.top,
            bottom: timerHook.popupPosition.bottom,
            left: timerHook.popupPosition.left,
            right: timerHook.popupPosition.right,
            width: isMobile ? '160px' : '200px',
          }}
        >
          {timerHook.showCustomInput ? (
            <div className="p-3">
              <input
                ref={timerHook.customInputRef}
                type="number"
                value={timerHook.customValue}
                onChange={timerHook.handleCustomInputChange}
                onKeyDown={timerHook.handleKeyPress}
                min="1"
                max="1800"
                placeholder="Seconds..."
                className="w-full px-3 py-2 bg-black/50 border border-white/30 rounded text-white text-sm placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-turquoise-500 focus:border-turquoise-500 mb-3"
              />
              <div className="flex gap-2">
                <button
                  onClick={timerHook.handleCustomSubmit}
                  className="flex-1 px-3 py-1.5 bg-turquoise-600 hover:bg-turquoise-500 text-white rounded text-sm font-medium transition"
                >
                  Set
                </button>
                <button
                  onClick={() => {
                    timerHook.setShowCustomInput(false);
                    timerHook.setCustomValue("");
                  }}
                  className="flex-1 px-3 py-1.5 border border-white/30 rounded text-white/80 hover:text-white hover:border-white/50 transition text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="py-1.5">
              {timerHook.durations.map((option) => (
                <button
                  key={option.value}
                  onClick={() => timerHook.handlePresetClick(option.value)}
                  className="w-full px-4 py-2 text-left text-white/90 hover:text-white hover:bg-white/10 transition text-sm font-medium"
                >
                  {option.label}
                </button>
              ))}
              <button
                onClick={timerHook.handleCustomClick}
                className="w-full px-4 py-2 text-left text-white/90 hover:text-white hover:bg-white/10 transition text-sm font-medium border-t border-white/10 mt-1"
              >
                Custom...
              </button>
            </div>
          )}
        </div>
      )}
      {/* Info Popup */}
      {(showInfoPopup || infoPopupPersistent) && stockInfo.ticker && (
        <div
          ref={infoPopupRef}
          className="absolute z-40 bg-black/95 backdrop-blur-md rounded-md border border-white/30 shadow-2xl overflow-hidden"
          style={{
            top: 'calc(0.5rem + 2.5rem + 2.5rem)',
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
    </>
  );
};

export default TimerDisplay;

