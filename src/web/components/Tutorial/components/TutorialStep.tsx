/**
 * @fileoverview Individual tutorial step component with tooltip and controls.
 * @module src/web/components/Tutorial/components/TutorialStep.tsx
 * @dependencies React
 */
"use client";

import React from "react";
import type { TutorialStep } from "../tutorialSteps";

export interface TutorialStepProps {
  step: TutorialStep;
  stepIndex: number;
  totalSteps: number;
  isLastStep: boolean;
  isWaitingForAction: boolean;
  showClickHint: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onComplete: () => void;
  tooltipPosition: { top: string; left: string; transform: string };
  tooltipRef: React.RefObject<HTMLDivElement>;
}

export const TutorialStepComponent: React.FC<TutorialStepProps> = ({
  step,
  stepIndex,
  totalSteps,
  isLastStep,
  isWaitingForAction,
  showClickHint,
  onNext,
  onPrevious,
  onSkip,
  onComplete,
  tooltipPosition,
  tooltipRef,
}) => {
  // Use useEffect to add direct click listener to Next button
  const nextButtonRef = React.useRef<HTMLButtonElement | null>(null);
  
  React.useEffect(() => {
    if (!nextButtonRef.current) return;
    
    const button = nextButtonRef.current;
    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (isLastStep) {
        onComplete();
      } else {
        onNext();
      }
    };
    
    button.addEventListener('click', handleClick, true); // Use capture phase
    return () => {
      button.removeEventListener('click', handleClick, true);
    };
  }, [isLastStep, onComplete, onNext]);

  // Ensure position values are valid
  const topValue = tooltipPosition.top;
  const leftValue = tooltipPosition.left;
  const isPercentage = topValue.includes('%') || leftValue.includes('%');
  
  // If using pixel values, ensure they're reasonable
  let safeTop = topValue;
  let safeLeft = leftValue;
  
  if (!isPercentage) {
    const topNum = parseFloat(topValue);
    const leftNum = parseFloat(leftValue);
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    
    // If position is way off, use center
    if (isNaN(topNum) || topNum < 0 || topNum > viewportHeight * 2) {
      safeTop = '50%';
      safeLeft = '50%';
    } else if (isNaN(leftNum) || leftNum < 0 || leftNum > viewportWidth * 2) {
      safeTop = '50%';
      safeLeft = '50%';
    }
  }

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[10000] max-w-sm sm:max-w-md"
      style={{
        top: safeTop,
        left: safeLeft,
        transform: tooltipPosition.transform,
        pointerEvents: 'auto',
        zIndex: 10001,
      }}
      role="dialog"
      aria-labelledby="tutorial-title"
      aria-describedby="tutorial-content"
      data-tutorial-button="true"
      onClick={(e) => {
        // Prevent clicks on tooltip from propagating to overlay
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        // Ensure mouse events work and don't reach overlay
        e.stopPropagation();
      }}
    >
      <div className="bg-soft-white/95 backdrop-blur-sm rounded-3xl border border-turquoise-200/60 shadow-2xl shadow-turquoise-950/20 p-4 sm:p-6">
        {/* Content */}
        <div className="mb-4">
          <h3 id="tutorial-title" className="text-lg font-semibold text-turquoise-900 mb-2">
            Step {stepIndex + 1} of {totalSteps}
          </h3>
          <p id="tutorial-content" className="text-sm sm:text-base text-turquoise-800 leading-relaxed">
            {step.content}
          </p>
          {step.interactive && isWaitingForAction && (
            <p className="text-xs sm:text-sm text-turquoise-600 mt-2 italic">
              {step.waitForAction === 'chart-click' && showClickHint
                ? 'Click on the chart to continue...'
                : 'Please complete this action to continue...'}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          <button
            data-tutorial-button="true"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSkip();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="text-sm text-turquoise-600 hover:text-turquoise-700 underline focus:outline-none focus:ring-2 focus:ring-turquoise-500 rounded px-2 py-1 cursor-pointer relative z-[10001]"
            aria-label="Skip tutorial"
            type="button"
            style={{ pointerEvents: 'auto', zIndex: 10001 }}
          >
            Skip
          </button>
          <div className="flex gap-2">
            {stepIndex > 0 && !step.interactive && (
              <button
                data-tutorial-button="true"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onPrevious();
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="px-4 py-2 text-sm font-medium text-turquoise-700 bg-turquoise-100 hover:bg-turquoise-200 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-turquoise-500 cursor-pointer relative z-[10001]"
                aria-label="Previous step"
                type="button"
                style={{ pointerEvents: 'auto', zIndex: 10001 }}
              >
                Previous
              </button>
            )}
            {!step.interactive && (
              <button
                ref={nextButtonRef}
                data-tutorial-button="true"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Call handlers directly
                  if (isLastStep) {
                    onComplete();
                  } else {
                    onNext();
                  }
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-turquoise-600 hover:bg-turquoise-500 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-turquoise-500 cursor-pointer relative z-[10001]"
                aria-label={isLastStep ? 'Complete tutorial' : 'Next step'}
                type="button"
                style={{ pointerEvents: 'auto', zIndex: 10001, position: 'relative' }}
              >
                {isLastStep ? 'Complete' : 'Next'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialStepComponent;

