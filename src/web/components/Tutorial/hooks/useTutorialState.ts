/**
 * @fileoverview Hook for managing tutorial state and interactions.
 * @module src/web/components/Tutorial/hooks/useTutorialState.ts
 * @dependencies React
 */
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { TUTORIAL_STEPS, type TutorialStep } from '../tutorialSteps';

export interface UseTutorialStateOptions {
  isActive: boolean;
  onStepChange?: (stepIndex: number) => void;
  timer?: {
    pause: () => void;
    resume: () => void;
    isRunning: boolean;
  };
}

export interface UseTutorialStateReturn {
  currentStepIndex: number;
  setCurrentStepIndex: (index: number) => void;
  currentStep: TutorialStep | undefined;
  isLastStep: boolean;
  isWaitingForAction: boolean;
  showSkipTooltip: boolean;
  setShowSkipTooltip: (show: boolean) => void;
  handleNext: () => void;
  handleComplete: () => void;
  handleSkip: () => void;
  actionListenersRef: React.MutableRefObject<Map<string, () => void>>;
  clickAnywhereTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
}

export function useTutorialState({
  isActive,
  onStepChange,
  timer,
}: UseTutorialStateOptions): UseTutorialStateReturn {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showSkipTooltip, setShowSkipTooltip] = useState(false);
  const [isWaitingForAction, setIsWaitingForAction] = useState(false);
  const actionListenersRef = useRef<Map<string, () => void>>(new Map());
  const clickAnywhereTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevActiveRef = useRef<boolean>(false);

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === TUTORIAL_STEPS.length - 1;

  // Reset tutorial to first step when it becomes active (or when reactivating)
  useEffect(() => {
    const wasInactive = prevActiveRef.current === false;
    const justBecameActive = isActive && wasInactive;
    
    // Only reset when tutorial first becomes active, not when step index changes
    if (justBecameActive) {
      // Reset to first step when tutorial starts or restarts
      setCurrentStepIndex(0);
      setShowSkipTooltip(false);
      setIsWaitingForAction(false);
      // Clear any pending timeouts
      if (clickAnywhereTimeoutRef.current) {
        clearTimeout(clickAnywhereTimeoutRef.current);
        clickAnywhereTimeoutRef.current = null;
      }
      // Clear all action listeners
      actionListenersRef.current.forEach((cleanup) => cleanup());
      actionListenersRef.current.clear();
    }
    
    prevActiveRef.current = isActive;
  }, [isActive]); // Removed currentStepIndex from dependencies

  // Pause timer when tutorial starts
  useEffect(() => {
    if (isActive && timer && timer.isRunning) {
      timer.pause();
    }
  }, [isActive, timer]);

  // Handle step changes
  useEffect(() => {
    if (onStepChange) {
      onStepChange(currentStepIndex);
    }
  }, [currentStepIndex, onStepChange]);

  const handleComplete = useCallback(async () => {
    try {
      const response = await fetch('/api/user/tutorial-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      });

      if (!response.ok) {
        console.error('Failed to mark tutorial as completed');
      }
    } catch (error) {
      console.error('Error marking tutorial as completed:', error);
    }

    if (timer) {
      timer.resume();
    }
  }, [timer]);

  // Set up action listeners for interactive steps
  useEffect(() => {
    if (!isActive || !currentStep) return;

    const step = currentStep;
    if (step.interactive && step.waitForAction) {
      setIsWaitingForAction(true);

      const handleAction = () => {
        setIsWaitingForAction(false);
        setTimeout(() => {
          if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
          } else {
            handleComplete();
          }
        }, 500);
      };

      if (step.waitForAction === 'chart-click') {
        const chart = document.querySelector('[data-tutorial-chart]');
        if (chart) {
          const selectionListener = () => {
            handleAction();
          };
          window.addEventListener('tutorial-selection-made', selectionListener);
          actionListenersRef.current.set('chart-click', () => {
            window.removeEventListener('tutorial-selection-made', selectionListener);
          });

          clickAnywhereTimeoutRef.current = setTimeout(() => {
            // Tooltip will be shown in the render
          }, 3000);
        }
      } else if (step.waitForAction === 'next-card-click') {
        const nextCardListener = () => {
          handleAction();
        };
        window.addEventListener('tutorial-next-card-clicked', nextCardListener);
        actionListenersRef.current.set('next-card-click', () => {
          window.removeEventListener('tutorial-next-card-clicked', nextCardListener);
        });
      }
    } else {
      setIsWaitingForAction(false);
    }

    return () => {
      if (step.waitForAction) {
        const cleanup = actionListenersRef.current.get(step.waitForAction);
        if (cleanup) {
          cleanup();
          actionListenersRef.current.delete(step.waitForAction);
        }
      }
      if (clickAnywhereTimeoutRef.current) {
        clearTimeout(clickAnywhereTimeoutRef.current);
        clickAnywhereTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, currentStepIndex, handleComplete]);

  const handleNext = useCallback(() => {
    setCurrentStepIndex((prevIndex) => {
      const nextIndex = prevIndex + 1;
      if (nextIndex < TUTORIAL_STEPS.length) {
        return nextIndex;
      } else {
        // If we're at or past the last step, complete the tutorial
        handleComplete();
        return prevIndex;
      }
    });
  }, [handleComplete]);

  const handleSkip = useCallback(() => {
    setShowSkipTooltip(true);
    
    if (timer) {
      timer.resume();
    }

    setTimeout(() => {
      setShowSkipTooltip(false);
    }, 5000);
  }, [timer]);

  return {
    currentStepIndex,
    setCurrentStepIndex,
    currentStep,
    isLastStep,
    isWaitingForAction,
    showSkipTooltip,
    setShowSkipTooltip,
    handleNext,
    handleComplete,
    handleSkip,
    actionListenersRef,
    clickAnywhereTimeoutRef,
  };
}

