"use client";

/**
 * Tutorial Component
 * 
 * Interactive tutorial system for guiding new users through the breakout trading flashcard game.
 * Features:
 * - Custom tooltip system matching auth modal styling
 * - Mobile-responsive design
 * - Timer pause/resume functionality
 * - Skip functionality with helpful tooltip
 * - Completion tracking via API
 * - Keyboard navigation support
 * - Accessibility features
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TutorialStep {
  id: string;
  target: string | null; // CSS selector or null for center of screen
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  interactive?: boolean; // If true, user must interact with target to continue
  waitForAction?: string; // Action to wait for (e.g., 'chart-click')
  showTarget?: boolean; // If true, show the target element (make it visible) during this step
}

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

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    target: null,
    content: "Welcome to Breakout Study Tool! This tutorial will show you how to practice breakout pattern recognition. Let's get started.",
    placement: 'center',
  },
  {
    id: 'chart-overview',
    target: '[data-tutorial-chart]',
    content: "This chart shows the stock's price action before the breakout. Your goal is to predict where the price will peak after breaking out.",
    placement: 'bottom',
  },
  {
    id: 'timer-explanation',
    target: '[data-tutorial-timer]',
    content: "The timer keeps your practice sessions fast-paced. You have limited time to analyze and make your prediction. This builds quick decision-making skills essential for trading.",
    placement: 'bottom',
  },
  {
    id: 'making-selection',
    target: '[data-tutorial-chart]',
    content: "Click on the chart where you think the price will peak after the breakout. You can only select points in the future (to the right of the last data point).",
    placement: 'bottom',
    interactive: true,
    waitForAction: 'chart-click',
  },
  {
    id: 'results-feedback',
    target: '[data-tutorial-results]',
    content: "After you make your selection, you'll see your accuracy score. The system compares your prediction to the actual post-breakout high. Aim for 70%+ accuracy for a correct prediction.",
    placement: 'top',
  },
  {
    id: 'round-history',
    target: '[data-tutorial-round-history]',
    content: "View your past rounds to track progress over time. Reviewing your history helps identify patterns in your performance and areas for improvement.",
    placement: 'left',
  },
  {
    id: 'timer-duration',
    target: '[data-tutorial-timer-duration]',
    content: "Adjust the timer duration to match your skill level. Shorter timers increase difficulty and build faster reflexes. Start with longer durations and work your way down.",
    placement: 'bottom',
  },
  {
    id: 'next-card',
    target: '[data-tutorial-next]',
    content: "After reviewing your results, click Next to move to the next breakout pattern. Practice regularly to improve your pattern recognition skills.",
    placement: 'top',
  },
  {
    id: 'completion',
    target: '[data-tutorial-profile]',
    content: "Great job! You can replay this tutorial anytime from your profile dropdown menu. Happy trading!",
    placement: 'bottom',
  },
];

export default function Tutorial({
  isActive,
  onComplete,
  onSkip,
  onStepChange,
  timer,
}: TutorialProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showSkipTooltip, setShowSkipTooltip] = useState(false);
  const [isWaitingForAction, setIsWaitingForAction] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: string; left: string; transform: string }>({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
  const [highlightPosition, setHighlightPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [selectableAreaHighlight, setSelectableAreaHighlight] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const actionListenersRef = useRef<Map<string, () => void>>(new Map());
  const clickAnywhereTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const positionUpdateRef = useRef<number | null>(null);

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === TUTORIAL_STEPS.length - 1;

  // Reset tutorial to first step when it becomes active
  useEffect(() => {
    if (isActive) {
      console.log('Tutorial activated - resetting to step 0');
      setCurrentStepIndex(0);
      setShowSkipTooltip(false);
      setIsWaitingForAction(false);
      // Reset positions
      setTooltipPosition({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
      setHighlightPosition(null);
      setSelectableAreaHighlight(null);
    } else {
      // Reset when tutorial becomes inactive
      setCurrentStepIndex(0);
      setShowSkipTooltip(false);
      setIsWaitingForAction(false);
      setSelectableAreaHighlight(null);
    }
  }, [isActive]);

  // Pause timer when tutorial starts
  useEffect(() => {
    if (isActive && timer && timer.isRunning) {
      timer.pause();
    }
  }, [isActive, timer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clickAnywhereTimeoutRef.current) {
        clearTimeout(clickAnywhereTimeoutRef.current);
      }
      // Remove all action listeners
      actionListenersRef.current.forEach((cleanup) => cleanup());
      actionListenersRef.current.clear();
    };
  }, []);

  // Handle step changes
  useEffect(() => {
    if (onStepChange) {
      onStepChange(currentStepIndex);
    }
  }, [currentStepIndex, onStepChange]);

  // Set up action listeners for interactive steps
  useEffect(() => {
    if (!isActive || !currentStep) return;

    const step = currentStep;
    if (step.interactive && step.waitForAction) {
      setIsWaitingForAction(true);

      // Set up listener based on action type
      const handleAction = () => {
        setIsWaitingForAction(false);
        // Small delay before moving to next step
        setTimeout(() => {
          if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
          } else {
            // Call handleComplete directly
            handleComplete();
          }
        }, 500);
      };

      if (step.waitForAction === 'chart-click') {
        // Listen for chart click - must be in selectable area
        // Use a custom event that the chart can dispatch, or listen after the chart handles it
        const chart = document.querySelector('[data-tutorial-chart]');
        if (chart) {
          // Don't intercept clicks - let the chart handle them normally
          // Listen for a custom event that indicates a valid selection was made
          const selectionListener = () => {
            console.log('Tutorial: Selection made event received');
            handleAction();
          };
          window.addEventListener('tutorial-selection-made', selectionListener);
          actionListenersRef.current.set('chart-click', () => {
            window.removeEventListener('tutorial-selection-made', selectionListener);
          });

          // Show "click anywhere" tooltip after 3 seconds
          clickAnywhereTimeoutRef.current = setTimeout(() => {
            // Tooltip will be shown in the render
          }, 3000);
        }
      }
    } else {
      setIsWaitingForAction(false);
    }

    return () => {
      // Cleanup listeners for this step
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
  }, [isActive, currentStepIndex]);

  const handleNext = useCallback(() => {
    if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      handleComplete();
    }
  }, [currentStepIndex]);

  const handleComplete = useCallback(async () => {
    // Mark tutorial as completed in database
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

    // Resume timer if it was running
    if (timer) {
      timer.resume();
    }

    onComplete();
  }, [timer, onComplete]);

  const handleSkip = useCallback(() => {
    // Don't mark as completed when skipped
    setShowSkipTooltip(true);
    
    // Resume timer if it was running
    if (timer) {
      timer.resume();
    }

    onSkip();

    // Hide tooltip after 5 seconds
    setTimeout(() => {
      setShowSkipTooltip(false);
    }, 5000);
  }, [timer, onSkip]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'Enter' && !currentStep?.interactive) {
        handleNext();
      } else if (e.key === 'ArrowRight' && !currentStep?.interactive) {
        handleNext();
      } else if (e.key === 'ArrowLeft' && currentStepIndex > 0 && !currentStep?.interactive) {
        setCurrentStepIndex(currentStepIndex - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, currentStepIndex, currentStep, handleNext, handleSkip]);

  if (!isActive) {
    return null;
  }

  // Calculate tooltip position reactively
  const updateTooltipPosition = useCallback(() => {
    if (!currentStep) {
      setTooltipPosition({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
      setHighlightPosition(null);
      setSelectableAreaHighlight(null);
      return;
    }

    if (currentStep.placement === 'center' || !currentStep.target) {
      setTooltipPosition({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
      setHighlightPosition(null);
      setSelectableAreaHighlight(null);
      return;
    }

    const targetElement = document.querySelector(currentStep.target);
    if (!targetElement) {
      // Fallback to center if target not found
      setTooltipPosition({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
      setHighlightPosition(null);
      setSelectableAreaHighlight(null);
      return;
    }

    // Special handling for step 4 (making-selection) - highlight only selectable area
    if (currentStep.id === 'making-selection') {
      // Find the chart container and calculate selectable area based on actual chart divider
      const chartContainer = targetElement.closest('[data-tutorial-chart]') || targetElement;
      const chartRect = chartContainer.getBoundingClientRect();
      
      // Try to find the SVG or chart element to get the actual chart dimensions
      const svgElement = chartContainer.querySelector('svg');
      if (svgElement) {
        const svgRect = svgElement.getBoundingClientRect();
        
        // Calculate selectable area based on actual divider position (matches chart logic)
        // The divider is at 70% on mobile, 75% on desktop
        const isMobile = window.innerWidth < 768;
        const dividerPositionPercent = isMobile ? 0.70 : 0.75;
        const chartWidth = svgRect.width;
        const chartHeight = svgRect.height;
        const selectableStartX = chartWidth * dividerPositionPercent;
        const selectableWidth = chartWidth - selectableStartX;
        
        // Also try to find the actual divider line element for more precision
        const dividerLine = svgElement.querySelector('line[data-divider]') || 
                           Array.from(svgElement.querySelectorAll('line')).find(line => {
                             const x1 = parseFloat(line.getAttribute('x1') || '0');
                             const x2 = parseFloat(line.getAttribute('x2') || '0');
                             // Divider line should be vertical and around 70-75% of width
                             return x1 === x2 && x1 > chartWidth * 0.65 && x1 < chartWidth * 0.80;
                           });
        
        let finalSelectableStartX = selectableStartX;
        if (dividerLine) {
          const dividerX = parseFloat(dividerLine.getAttribute('x1') || String(selectableStartX));
          finalSelectableStartX = dividerX;
        }
        
        setSelectableAreaHighlight({
          top: svgRect.top,
          left: svgRect.left + finalSelectableStartX,
          width: chartWidth - finalSelectableStartX,
          height: chartHeight,
        });
        
        // Don't set regular highlight for this step
        setHighlightPosition(null);
      } else {
        // Fallback: highlight right portion of chart container using same logic
        const isMobile = window.innerWidth < 768;
        const dividerPositionPercent = isMobile ? 0.70 : 0.75;
        setSelectableAreaHighlight({
          top: chartRect.top,
          left: chartRect.left + (chartRect.width * dividerPositionPercent),
          width: chartRect.width * (1 - dividerPositionPercent),
          height: chartRect.height,
        });
        setHighlightPosition(null);
      }
      
      // Continue to calculate tooltip position (use rect for tooltip positioning)
      // The rect will be used for tooltip positioning below
    } else {
      // For other steps, clear selectable area highlight
      setSelectableAreaHighlight(null);
    }

    const rect = targetElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = 384; // max-w-sm = 384px
    const tooltipHeight = 250; // Increased estimate to account for content
    const padding = 16; // Minimum padding from viewport edges
    
    // Update highlight position (skip for making-selection step, handled above)
    if (currentStep.id !== 'making-selection') {
      setHighlightPosition({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    }

    // Helper function to check if a position fits within viewport
    const fitsInViewport = (top: number, left: number, transform: string): boolean => {
      let tooltipTop = top;
      let tooltipLeft = left;
      let tooltipRight = left;
      let tooltipBottom = top;

      // Calculate actual tooltip bounds based on transform
      if (transform.includes('translate(-50%, -100%)')) {
        // Top placement
        tooltipTop = top - tooltipHeight;
        tooltipBottom = top;
        tooltipLeft = left - tooltipWidth / 2;
        tooltipRight = left + tooltipWidth / 2;
      } else if (transform.includes('translate(-50%, 0)')) {
        // Bottom placement
        tooltipTop = top;
        tooltipBottom = top + tooltipHeight;
        tooltipLeft = left - tooltipWidth / 2;
        tooltipRight = left + tooltipWidth / 2;
      } else if (transform.includes('translate(-100%, -50%)')) {
        // Left placement
        tooltipTop = top - tooltipHeight / 2;
        tooltipBottom = top + tooltipHeight / 2;
        tooltipLeft = left - tooltipWidth;
        tooltipRight = left;
      } else if (transform.includes('translate(0, -50%)')) {
        // Right placement
        tooltipTop = top - tooltipHeight / 2;
        tooltipBottom = top + tooltipHeight / 2;
        tooltipLeft = left;
        tooltipRight = left + tooltipWidth;
      } else {
        // Center placement
        tooltipTop = top - tooltipHeight / 2;
        tooltipBottom = top + tooltipHeight / 2;
        tooltipLeft = left - tooltipWidth / 2;
        tooltipRight = left + tooltipWidth / 2;
      }

      return (
        tooltipTop >= padding &&
        tooltipLeft >= padding &&
        tooltipRight <= viewportWidth - padding &&
        tooltipBottom <= viewportHeight - padding
      );
    };

    // Try preferred placement first, then fallback to alternatives
    const preferredPlacement = currentStep.placement || 'bottom';
    let top = rect.top;
    let left = rect.left;
    let transform = '';
    let placement = preferredPlacement;

    // Try placements in order of preference
    const placementOrder = 
      preferredPlacement === 'top' ? ['top', 'bottom', 'right', 'left', 'center'] :
      preferredPlacement === 'bottom' ? ['bottom', 'top', 'right', 'left', 'center'] :
      preferredPlacement === 'left' ? ['left', 'right', 'bottom', 'top', 'center'] :
      preferredPlacement === 'right' ? ['right', 'left', 'bottom', 'top', 'center'] :
      ['bottom', 'top', 'right', 'left', 'center'];

    let foundValidPosition = false;
    for (const tryPlacement of placementOrder) {
      switch (tryPlacement) {
        case 'top':
          top = rect.top - 10;
          left = rect.left + rect.width / 2;
          transform = 'translate(-50%, -100%)';
          break;
        case 'bottom':
          top = rect.bottom + 10;
          left = rect.left + rect.width / 2;
          transform = 'translate(-50%, 0)';
          break;
        case 'left':
          top = rect.top + rect.height / 2;
          left = rect.left - 10;
          transform = 'translate(-100%, -50%)';
          break;
        case 'right':
          top = rect.top + rect.height / 2;
          left = rect.right + 10;
          transform = 'translate(0, -50%)';
          break;
        case 'center':
          top = viewportHeight / 2;
          left = viewportWidth / 2;
          transform = 'translate(-50%, -50%)';
          break;
      }

      if (fitsInViewport(top, left, transform)) {
        placement = tryPlacement;
        foundValidPosition = true;
        break;
      }
    }

    // If no placement fits perfectly, adjust to fit within viewport
    if (!foundValidPosition || placement !== 'center') {
      // Calculate actual tooltip bounds to clamp correctly
      let tooltipTop = top;
      let tooltipLeft = left;
      let tooltipRight = left;
      let tooltipBottom = top;

      if (transform.includes('translate(-50%, -100%)')) {
        // Top placement - tooltip extends upward
        tooltipTop = top - tooltipHeight;
        tooltipBottom = top;
        tooltipLeft = left - tooltipWidth / 2;
        tooltipRight = left + tooltipWidth / 2;
      } else if (transform.includes('translate(-50%, 0)')) {
        // Bottom placement - tooltip extends downward
        tooltipTop = top;
        tooltipBottom = top + tooltipHeight;
        tooltipLeft = left - tooltipWidth / 2;
        tooltipRight = left + tooltipWidth / 2;
      } else if (transform.includes('translate(-100%, -50%)')) {
        // Left placement - tooltip extends leftward
        tooltipTop = top - tooltipHeight / 2;
        tooltipBottom = top + tooltipHeight / 2;
        tooltipLeft = left - tooltipWidth;
        tooltipRight = left;
      } else if (transform.includes('translate(0, -50%)')) {
        // Right placement - tooltip extends rightward
        tooltipTop = top - tooltipHeight / 2;
        tooltipBottom = top + tooltipHeight / 2;
        tooltipLeft = left;
        tooltipRight = left + tooltipWidth;
      }

      // Adjust position to keep tooltip within viewport
      if (tooltipLeft < padding) {
        const offset = padding - tooltipLeft;
        left += offset;
      }
      if (tooltipRight > viewportWidth - padding) {
        const offset = tooltipRight - (viewportWidth - padding);
        left -= offset;
      }
      if (tooltipTop < padding) {
        const offset = padding - tooltipTop;
        top += offset;
      }
      if (tooltipBottom > viewportHeight - padding) {
        const offset = tooltipBottom - (viewportHeight - padding);
        top -= offset;
      }
    }

    setTooltipPosition({ 
      top: `${top}px`, 
      left: `${left}px`, 
      transform 
    });
  }, [currentStep]);

  // Show/hide target elements based on step
  useEffect(() => {
    if (!isActive || !currentStep) return;

    // Show target element if showTarget is true
    if (currentStep.showTarget && currentStep.target) {
      const targetElement = document.querySelector(currentStep.target);
      if (targetElement) {
        const container = targetElement.closest('.flex.flex-col.gap-4.mb-4');
        if (container) {
          (container as HTMLElement).style.display = 'flex';
        }
      }
    } else if (currentStep.target) {
      // Hide target element when leaving the step
      const targetElement = document.querySelector(currentStep.target);
      if (targetElement) {
        const container = targetElement.closest('.flex.flex-col.gap-4.mb-4');
        if (container && !currentStep.showTarget) {
          (container as HTMLElement).style.display = 'none';
        }
      }
    }

    return () => {
      // Cleanup: hide target when step changes
      if (currentStep.target) {
        const targetElement = document.querySelector(currentStep.target);
        if (targetElement) {
          const container = targetElement.closest('.flex.flex-col.gap-4.mb-4');
          if (container && currentStep.showTarget) {
            // Only hide if we're leaving a step that showed it
            const nextStep = TUTORIAL_STEPS[currentStepIndex + 1];
            if (!nextStep?.showTarget) {
              (container as HTMLElement).style.display = 'none';
            }
          }
        }
      }
    };
  }, [isActive, currentStepIndex, currentStep]);

  // Update position on step change, scroll, and resize
  useEffect(() => {
    if (!isActive) return;

    updateTooltipPosition();

    const handleUpdate = () => {
      if (positionUpdateRef.current) {
        cancelAnimationFrame(positionUpdateRef.current);
      }
      positionUpdateRef.current = requestAnimationFrame(() => {
        updateTooltipPosition();
      });
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);
    
    // Update periodically to catch dynamic content changes
    const interval = setInterval(handleUpdate, 100);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
      clearInterval(interval);
      if (positionUpdateRef.current) {
        cancelAnimationFrame(positionUpdateRef.current);
      }
    };
  }, [isActive, currentStepIndex, updateTooltipPosition]);

  // Add data attribute to body when tutorial is active (for preventing chart blur)
  useEffect(() => {
    if (isActive) {
      document.body.setAttribute('data-tutorial-active', 'true');
      return () => {
        document.body.removeAttribute('data-tutorial-active');
      };
    }
  }, [isActive]);

  const tutorialContent = (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[9998] bg-turquoise-950/70 backdrop-blur-sm"
        aria-hidden="true"
        data-tutorial-active="true"
      />

      {/* Highlight overlay for target element */}
      {highlightPosition && (
        <div
          className="fixed z-[9999] pointer-events-none border-2 border-turquoise-500 rounded-lg shadow-2xl shadow-turquoise-500/50"
          style={{
            top: `${highlightPosition.top}px`,
            left: `${highlightPosition.left}px`,
            width: `${highlightPosition.width}px`,
            height: `${highlightPosition.height}px`,
            animation: 'pulse 2s ease-in-out infinite',
            filter: 'none', // Ensure highlight is never blurred
          }}
        />
      )}

      {/* Selectable area highlight for chart selection step */}
      {selectableAreaHighlight && (
        <div
          className="fixed z-[9999] pointer-events-none border-2 border-turquoise-500 rounded-lg shadow-2xl shadow-turquoise-500/50 bg-turquoise-500/10"
          style={{
            top: `${selectableAreaHighlight.top}px`,
            left: `${selectableAreaHighlight.left}px`,
            width: `${selectableAreaHighlight.width}px`,
            height: `${selectableAreaHighlight.height}px`,
            animation: 'pulse 2s ease-in-out infinite',
            filter: 'none', // Ensure highlight is never blurred
          }}
        />
      )}

      {/* Tooltip */}
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
              Step {currentStepIndex + 1} of {TUTORIAL_STEPS.length}
            </h3>
            <p id="tutorial-content" className="text-sm sm:text-base text-turquoise-800 leading-relaxed">
              {currentStep?.content}
            </p>
            {currentStep?.interactive && isWaitingForAction && (
              <p className="text-xs sm:text-sm text-turquoise-600 mt-2 italic">
                {currentStep.waitForAction === 'chart-click' && clickAnywhereTimeoutRef.current
                  ? 'Click on the chart to continue...'
                  : 'Please complete this action to continue...'}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleSkip}
              className="text-sm text-turquoise-600 hover:text-turquoise-700 underline focus:outline-none focus:ring-2 focus:ring-turquoise-500 rounded px-2 py-1"
              aria-label="Skip tutorial"
            >
              Skip
            </button>
            <div className="flex gap-2">
              {currentStepIndex > 0 && !currentStep?.interactive && (
                <button
                  onClick={() => setCurrentStepIndex(currentStepIndex - 1)}
                  className="px-4 py-2 text-sm font-medium text-turquoise-700 bg-turquoise-100 hover:bg-turquoise-200 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-turquoise-500"
                  aria-label="Previous step"
                >
                  Previous
                </button>
              )}
              {!currentStep?.interactive && (
                <button
                  onClick={isLastStep ? handleComplete : handleNext}
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

      {/* Skip tooltip */}
      {showSkipTooltip && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[10001] max-w-sm">
          <div className="bg-black/95 backdrop-blur-sm rounded-md border border-white/30 shadow-2xl p-4">
            <p className="text-sm text-white/90 text-center">
              You can replay this tutorial anytime from your profile dropdown (click your name in the header)
            </p>
            <button
              onClick={() => setShowSkipTooltip(false)}
              className="mt-2 w-full text-xs text-white/70 hover:text-white underline focus:outline-none focus:ring-2 focus:ring-turquoise-500 rounded px-2 py-1"
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

