/**
 * @fileoverview Hook for managing tutorial state and interactions.
 * @module src/web/components/Tutorial/hooks/useTutorialState.ts
 * @dependencies React
 */
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
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
  hideTooltipOnStep4: boolean;
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
  const [hideTooltipOnStep4, setHideTooltipOnStep4] = useState(false);
  const actionListenersRef = useRef<Map<string, () => void>>(new Map());
  const clickAnywhereTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevActiveRef = useRef<boolean>(false);
  // Refs for step 4 event tracking (persist across re-renders)
  const selectionMadeRef = useRef<boolean>(false);
  const animationCompleteRef = useRef<boolean>(false);
  // Ref to track current step ID to avoid stale closures in event listeners
  const currentStepIdRef = useRef<string | undefined>(undefined);
  // Ref to track current step index to avoid stale closures
  const currentStepIndexRef = useRef<number>(0);

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === TUTORIAL_STEPS.length - 1;
  
  // Update step ID and index refs when step changes - CRITICAL for event listeners to avoid stale closures
  useEffect(() => {
    const newStepId = currentStep?.id;
    const oldStepId = currentStepIdRef.current;
    const oldIndex = currentStepIndexRef.current;
    currentStepIdRef.current = newStepId;
    currentStepIndexRef.current = currentStepIndex;
    console.log('[Tutorial State] Step refs updated - ID:', oldStepId, '->', newStepId, 'Index:', oldIndex, '->', currentStepIndex);
  }, [currentStep?.id, currentStepIndex]);

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
        setHideTooltipOnStep4(false);
        // Reset event tracking refs
        selectionMadeRef.current = false;
        animationCompleteRef.current = false;
        // Reset step tracking refs
        currentStepIndexRef.current = 0;
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
    
    // Reset hideTooltipOnStep4 when step changes away from step 4
    useEffect(() => {
      if (currentStep?.id !== 'making-selection') {
        console.log('[Tutorial State] Step changed away from making-selection, resetting hideTooltipOnStep4. Current step:', currentStep?.id, 'index:', currentStepIndex);
        setHideTooltipOnStep4((prev) => {
          if (prev !== false) {
            console.log('[Tutorial State] Resetting hideTooltipOnStep4 from', prev, 'to false');
            return false;
          }
          return prev;
        });
      } else {
        console.log('[Tutorial State] On making-selection step, hideTooltipOnStep4:', hideTooltipOnStep4);
      }
    }, [currentStep?.id, currentStepIndex]);

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
        // CRITICAL: Double-check we're still on step 4 before proceeding
        const currentStepId = currentStepIdRef.current;
        const currentStepIdx = currentStepIndexRef.current;
        console.log('[Tutorial State] handleAction called, current step:', currentStepId, 'index:', currentStepIdx);
        
        if (currentStepId !== 'making-selection' || currentStepIdx !== 3) {
          console.log('[Tutorial State] handleAction called but not on step 4, aborting. Current step:', currentStepId, 'index:', currentStepIdx);
          return;
        }
        
        console.log('[Tutorial State] handleAction proceeding to move from step', currentStepIdx, 'to step', currentStepIdx + 1);
        setIsWaitingForAction(false);
        // Don't reset hideTooltipOnStep4 here - the useEffect will handle it when step changes
        // This prevents tooltip from briefly showing on step 4 before moving to step 5
        console.log('[Tutorial State] NOT resetting hideTooltipOnStep4 in handleAction - useEffect will handle it after step change');
        // Use functional update to ensure we have the latest step index
        // Don't use setTimeout - update immediately
        setCurrentStepIndex((prevIndex) => {
          const nextIndex = prevIndex + 1;
          const nextStepId = TUTORIAL_STEPS[nextIndex]?.id;
          console.log('[Tutorial State] Moving from step', prevIndex, 'to step', nextIndex, 'step id:', nextStepId);
          // Immediately update refs to prevent stale closures
          if (nextIndex < TUTORIAL_STEPS.length) {
            // Update refs immediately before state update completes
            currentStepIndexRef.current = nextIndex;
            currentStepIdRef.current = nextStepId;
            console.log('[Tutorial State] Step index updated to', nextIndex, '- refs updated immediately, step ID:', nextStepId);
            return nextIndex;
          } else {
            // If we're at or past the last step, complete the tutorial
            console.log('[Tutorial State] Last step reached, completing tutorial');
            handleComplete();
            return prevIndex;
          }
        });
      };

      if (step.waitForAction === 'chart-click') {
        const chart = document.querySelector('[data-tutorial-chart]');
        if (chart) {
          // Reset refs when setting up listeners for a new step
          selectionMadeRef.current = false;
          animationCompleteRef.current = false;
          
          const checkAndProceed = () => {
            // CRITICAL: Check current step using refs to avoid stale closure
            // Only proceed if we're STILL on step 4 (making-selection) at index 3
            const stepId = currentStepIdRef.current;
            const stepIndex = currentStepIndexRef.current;
            console.log('[Tutorial State] checkAndProceed called - stepId:', stepId, 'stepIndex:', stepIndex);

            if (stepId !== 'making-selection' || stepIndex !== 3) {
              console.log('[Tutorial State] checkAndProceed called but not on step 4, ignoring. Current step:', stepId, 'index:', stepIndex);
              return;
            }

            // CRITICAL: Only wait for selection to be made, NOT animation
            // The animation/timer events will call this after selection is made
            // This way we progress immediately when both conditions are met
            const selectionMade = selectionMadeRef.current;
            const animationComplete = animationCompleteRef.current;
            console.log('[Tutorial State] checkAndProceed called on step 4:', {
              selectionMade,
              animationComplete,
              bothComplete: selectionMade && animationComplete,
              currentStepId: stepId,
              currentStepIndex: stepIndex
            });

            // Only require selection to be made - animation will trigger this function
            // when it completes, at which point both will be true
            if (selectionMade && animationComplete) {
              console.log('[Tutorial State] ====== BOTH CONDITIONS MET: Selection AND Animation complete ======');
              console.log('[Tutorial State] Both selection and animation complete, proceeding to step 5 (results-feedback)');
              // Double-check we're still on step 4 before proceeding
              if (currentStepIdRef.current === 'making-selection' && currentStepIndexRef.current === 3) {
                console.log('[Tutorial State] ====== CALLING handleAction to move to STEP 5 ======');
                handleAction();
                // Reset refs AFTER handleAction completes
                selectionMadeRef.current = false;
                animationCompleteRef.current = false;
                console.log('[Tutorial State] Refs reset after handleAction completed');
              } else {
                console.log('[Tutorial State] Step changed while processing, aborting proceed. Current step:', currentStepIdRef.current, 'index:', currentStepIndexRef.current);
              }
            } else {
              console.log('[Tutorial State] ====== WAITING: Not all conditions met yet ======');
              console.log('[Tutorial State] Waiting for both selection and animation. Current state:', {
                selectionMade,
                animationComplete,
                needSelection: !selectionMade,
                needAnimation: !animationComplete
              });
            }
          };
          
          const selectionListener = () => {
            console.log('[Tutorial State] ====== TUTORIAL STEP 4: Selection made event received ======');
            console.log('[Tutorial State] Selection made on step 4, hiding tooltip IMMEDIATELY');
            // CRITICAL: Set ref FIRST before state update to prevent race conditions
            selectionMadeRef.current = true;
            console.log('[Tutorial State] selectionMadeRef set to TRUE');
            // Hide tooltip IMMEDIATELY using flushSync to force synchronous update
            // This must happen on the FIRST selection, not the second
            flushSync(() => {
              setHideTooltipOnStep4(true);
            });
            console.log('[Tutorial State] hideTooltipOnStep4 set to true IMMEDIATELY (flushSync)');
            // Don't proceed yet - wait for animation
            console.log('[Tutorial State] Calling checkAndProceed after selection (waiting for animation)');
            checkAndProceed();
          };
          
          // Listen for after animation complete
          const animationListener = () => {
            console.log('[Tutorial State] ====== TUTORIAL STEP 4: After animation complete event received ======');
            console.log('[Tutorial State] After animation complete event received on step 4');
            animationCompleteRef.current = true;
            console.log('[Tutorial State] animationCompleteRef set to TRUE');
            // Don't reset hideTooltipOnStep4 here - it will be reset in handleAction after step change
            // This prevents tooltip from showing on step 4 again before we move to step 5
            console.log('[Tutorial State] Calling checkAndProceed after animation complete');
            checkAndProceed();
          };
          
          // Also listen for score popup timer completion
          const scoreTimerListener = () => {
            // CRITICAL: Check current step using refs to avoid stale closure
            // Only proceed if we're STILL on step 4 (making-selection) at index 3
            // If already on step 5, ignore the event completely
            const stepId = currentStepIdRef.current;
            const stepIndex = currentStepIndexRef.current;
            console.log('[Tutorial State] ====== TUTORIAL STEP 4: Score timer completed event received ======');
            console.log('[Tutorial State] Score timer completed event received. Current step (from refs):', stepId, 'index:', stepIndex);
            if (stepId !== 'making-selection' || stepIndex !== 3) {
              console.log('[Tutorial State] Score timer completed but not on step 4, ignoring completely. Current step:', stepId, 'index:', stepIndex);
              return;
            }
            console.log('[Tutorial State] Score popup timer completed on step 4, marking animation complete');
            // Mark animation as complete and check
            animationCompleteRef.current = true;
            console.log('[Tutorial State] animationCompleteRef set to TRUE (via score timer)');
            // Don't reset hideTooltipOnStep4 here - it will be reset in handleAction after step change
            // This prevents tooltip from showing on step 4 again before we move to step 5
            console.log('[Tutorial State] NOT resetting hideTooltipOnStep4 yet - will reset after moving to step 5');
            // checkAndProceed will verify we're still on step 4 before proceeding
            console.log('[Tutorial State] Calling checkAndProceed after score timer');
            checkAndProceed();
          };
          
          console.log('[Tutorial State] Setting up event listeners for step 4 (chart-click)');
          window.addEventListener('tutorial-selection-made', selectionListener, { capture: true });
          window.addEventListener('tutorial-after-animation-complete', animationListener, { capture: true });
          window.addEventListener('tutorial-score-timer-complete', scoreTimerListener, { capture: true });
          console.log('[Tutorial State] Event listeners registered for tutorial-selection-made, tutorial-after-animation-complete, and tutorial-score-timer-complete');
          
          actionListenersRef.current.set('chart-click', () => {
            window.removeEventListener('tutorial-selection-made', selectionListener, { capture: true });
            window.removeEventListener('tutorial-after-animation-complete', animationListener, { capture: true });
            window.removeEventListener('tutorial-score-timer-complete', scoreTimerListener, { capture: true });
            // Reset refs on cleanup
            selectionMadeRef.current = false;
            animationCompleteRef.current = false;
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
  }, [isActive, currentStep?.id]); // Only depend on step ID, not index or handleComplete

  const handleNext = useCallback(() => {
    console.log('[Tutorial State] handleNext called, current step index:', currentStepIndex);
    setCurrentStepIndex((prevIndex) => {
      const nextIndex = prevIndex + 1;
      console.log('[Tutorial State] handleNext: moving from step', prevIndex, 'to step', nextIndex, 'step id:', TUTORIAL_STEPS[nextIndex]?.id);
      if (nextIndex < TUTORIAL_STEPS.length) {
        // Reset hideTooltipOnStep4 when moving to next step
        setHideTooltipOnStep4(false);
        return nextIndex;
      } else {
        // If we're at or past the last step, complete the tutorial
        console.log('[Tutorial State] Last step reached in handleNext, completing tutorial');
        handleComplete();
        return prevIndex;
      }
    });
  }, [handleComplete, currentStepIndex]);

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
    hideTooltipOnStep4,
    handleNext,
    handleComplete,
    handleSkip,
    actionListenersRef,
    clickAnywhereTimeoutRef,
  };
}

