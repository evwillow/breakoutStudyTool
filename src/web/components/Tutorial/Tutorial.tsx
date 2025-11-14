/**
 * @fileoverview Interactive onboarding tutorial overlay with guided steps, tooltips, and action tracking.
 * @module src/web/components/Tutorial/Tutorial.tsx
 * @dependencies React, react-dom, hooks, components
 */
"use client";

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTutorialState } from './hooks/useTutorialState';
import { useTutorialPosition } from './hooks/useTutorialPosition';
import TutorialStepComponent from './components/TutorialStep';
import { TUTORIAL_STEPS } from './tutorialSteps';

interface TutorialProps {
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onStepChange?: (stepIndex: number) => void;
  timer?: {
    pause: () => void;
    resume: () => void;
    isRunning: boolean;
  };
}

export default function Tutorial({
  isActive,
  onComplete,
  onSkip,
  onStepChange,
  timer,
}: TutorialProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // Add click listener directly to window to catch button clicks before overlay
  useEffect(() => {
    if (!isActive) return;
    
    const handleWindowClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if click is on a tutorial button
      if (target.closest('[data-tutorial-button]') && target.closest('[role="dialog"]')) {
        // Let the button's own handler deal with it
        return;
      }
    };
    
    // Use capture phase to catch events early
    window.addEventListener('click', handleWindowClick, true);
    return () => {
      window.removeEventListener('click', handleWindowClick, true);
    };
  }, [isActive]);

  const tutorialState = useTutorialState({
    isActive,
    onStepChange,
    timer,
  });

  const position = useTutorialPosition(
    isActive,
    tutorialState.currentStep,
    tutorialState.currentStepIndex
  );

  // Handle keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        tutorialState.handleSkip();
        onSkip();
      } else if (e.key === 'Enter' && !tutorialState.currentStep?.interactive) {
        tutorialState.handleNext();
      } else if (e.key === 'ArrowRight' && !tutorialState.currentStep?.interactive) {
        tutorialState.handleNext();
      } else if (e.key === 'ArrowLeft' && tutorialState.currentStepIndex > 0 && !tutorialState.currentStep?.interactive) {
        tutorialState.setCurrentStepIndex(tutorialState.currentStepIndex - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, tutorialState, onSkip]);

  // Show/hide target elements based on step
  useEffect(() => {
    if (!isActive || !tutorialState.currentStep) return;

    if (tutorialState.currentStep.showTarget && tutorialState.currentStep.target) {
      const targetElement = document.querySelector(tutorialState.currentStep.target);
      if (targetElement) {
        const container = targetElement.closest('.flex.flex-col.gap-4.mb-4');
        if (container) {
          (container as HTMLElement).style.display = 'flex';
        }
      }
    } else if (tutorialState.currentStep.target) {
      const targetElement = document.querySelector(tutorialState.currentStep.target);
      if (targetElement) {
        const container = targetElement.closest('.flex.flex-col.gap-4.mb-4');
        if (container && !tutorialState.currentStep.showTarget) {
          (container as HTMLElement).style.display = 'none';
        }
      }
    }

    return () => {
      if (tutorialState.currentStep?.target) {
        const targetElement = document.querySelector(tutorialState.currentStep.target);
        if (targetElement) {
          const container = targetElement.closest('.flex.flex-col.gap-4.mb-4');
          if (container && tutorialState.currentStep?.showTarget) {
            const nextStep = TUTORIAL_STEPS[tutorialState.currentStepIndex + 1];
            if (!nextStep?.showTarget) {
              (container as HTMLElement).style.display = 'none';
            }
          }
        }
      }
    };
  }, [isActive, tutorialState.currentStepIndex, tutorialState.currentStep]);

  // Add data attribute to body when tutorial is active
  useEffect(() => {
    if (isActive) {
      document.body.setAttribute('data-tutorial-active', 'true');
      return () => {
        document.body.removeAttribute('data-tutorial-active');
      };
    }
  }, [isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tutorialState.clickAnywhereTimeoutRef.current) {
        clearTimeout(tutorialState.clickAnywhereTimeoutRef.current);
      }
      tutorialState.actionListenersRef.current.forEach((cleanup) => cleanup());
      tutorialState.actionListenersRef.current.clear();
    };
  }, [tutorialState]);

  if (!isActive || !tutorialState.currentStep) {
    return null;
  }

  const handleComplete = () => {
    tutorialState.handleComplete();
    onComplete();
  };

  const handleSkip = () => {
    tutorialState.handleSkip();
    onSkip();
  };

  const tutorialContent = (
    <>
      {/* Overlay - use CSS to exclude dialog area from pointer events */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[9998] bg-turquoise-950/70 backdrop-blur-sm"
        aria-hidden="true"
        data-tutorial-active="true"
        style={{ 
          pointerEvents: 'auto',
          // Use CSS to allow pointer events through for dialog
        }}
        onMouseDown={(e) => {
          const target = e.target as HTMLElement;
          // If clicking directly on overlay (not on any child), prevent it
          if (target === overlayRef.current || target === e.currentTarget) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          // Otherwise let it through
        }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          // If clicking directly on overlay (not on any child), prevent it
          if (target === overlayRef.current || target === e.currentTarget) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          // Otherwise let it through
        }}
      />

      {/* Highlight overlay for target element */}
      {position.highlightPosition && (
        <div
          className="fixed z-[9999] pointer-events-none border-2 border-turquoise-500 rounded-lg shadow-2xl shadow-turquoise-500/50"
          style={{
            top: `${position.highlightPosition.top}px`,
            left: `${position.highlightPosition.left}px`,
            width: `${position.highlightPosition.width}px`,
            height: `${position.highlightPosition.height}px`,
            animation: 'pulse 2s ease-in-out infinite',
            filter: 'none',
          }}
        />
      )}

      {/* Selectable area highlight for chart selection step */}
      {position.selectableAreaHighlight && (
        <div
          className="fixed z-[9999] pointer-events-none border-2 border-turquoise-500 rounded-lg shadow-2xl shadow-turquoise-500/50 bg-turquoise-500/10"
          style={{
            top: `${position.selectableAreaHighlight.top}px`,
            left: `${position.selectableAreaHighlight.left}px`,
            width: `${position.selectableAreaHighlight.width}px`,
            height: `${position.selectableAreaHighlight.height}px`,
            animation: 'pulse 2s ease-in-out infinite',
            filter: 'none',
          }}
        />
      )}

      {/* Tooltip */}
      <TutorialStepComponent
        step={tutorialState.currentStep}
        stepIndex={tutorialState.currentStepIndex}
        totalSteps={TUTORIAL_STEPS.length}
        isLastStep={tutorialState.isLastStep}
        isWaitingForAction={tutorialState.isWaitingForAction}
        showClickHint={!!tutorialState.clickAnywhereTimeoutRef.current}
        onNext={tutorialState.handleNext}
        onPrevious={() => {
          if (tutorialState.currentStepIndex > 0) {
            tutorialState.setCurrentStepIndex(tutorialState.currentStepIndex - 1);
          }
        }}
        onSkip={handleSkip}
        onComplete={handleComplete}
        tooltipPosition={position.tooltipPosition}
        tooltipRef={tooltipRef}
      />

      {/* Skip tooltip */}
      {tutorialState.showSkipTooltip && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[10001] max-w-sm">
          <div className="bg-black/95 backdrop-blur-sm rounded-md border border-white/30 shadow-2xl p-4">
            <p className="text-sm text-white/90 text-center">
              You can replay this tutorial anytime from your profile dropdown (click your name in the header)
            </p>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                tutorialState.setShowSkipTooltip(false);
              }}
              className="mt-2 w-full text-xs text-white/70 hover:text-white underline focus:outline-none focus:ring-2 focus:ring-turquoise-500 rounded px-2 py-1 cursor-pointer"
              type="button"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Animation styles */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 0 0 rgba(45, 212, 191, 0.7);
          }
          50% {
            opacity: 0.8;
            box-shadow: 0 0 20px 10px rgba(45, 212, 191, 0.35);
          }
        }
        /* Prevent blur on chart and highlighted areas during tutorial */
        [data-tutorial-active] [data-tutorial-chart],
        [data-tutorial-active] [data-tutorial-chart] * {
          filter: none !important;
        }
      `}</style>
    </>
  );

  // Render in portal for proper z-index stacking
  if (typeof window !== 'undefined') {
    return createPortal(tutorialContent, document.body);
  }

  return null;
}
