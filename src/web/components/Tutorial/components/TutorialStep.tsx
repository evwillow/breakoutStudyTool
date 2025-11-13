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
  return (
    <div
      ref={tooltipRef}
      className="fixed z-[10000] max-w-sm sm:max-w-md"
      style={tooltipPosition}
      role="dialog"
      aria-labelledby="tutorial-title"
      aria-describedby="tutorial-content"
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
            onClick={onSkip}
            className="text-sm text-turquoise-600 hover:text-turquoise-700 underline focus:outline-none focus:ring-2 focus:ring-turquoise-500 rounded px-2 py-1"
            aria-label="Skip tutorial"
          >
            Skip
          </button>
          <div className="flex gap-2">
            {stepIndex > 0 && !step.interactive && (
              <button
                onClick={onPrevious}
                className="px-4 py-2 text-sm font-medium text-turquoise-700 bg-turquoise-100 hover:bg-turquoise-200 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-turquoise-500"
                aria-label="Previous step"
              >
                Previous
              </button>
            )}
            {!step.interactive && (
              <button
                onClick={isLastStep ? onComplete : onNext}
                className="px-4 py-2 text-sm font-medium text-white bg-turquoise-600 hover:bg-turquoise-500 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-turquoise-500"
                aria-label={isLastStep ? 'Complete tutorial' : 'Next step'}
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

