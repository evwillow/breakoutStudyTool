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
  tooltipRef: React.RefObject<HTMLDivElement | null>;
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
      console.log('[TutorialStep] Next button clicked via direct listener');
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) {
        e.stopImmediatePropagation();
      }
      if (isLastStep) {
        console.log('[TutorialStep] Calling onComplete from direct listener');
        onComplete();
      } else {
        console.log('[TutorialStep] Calling onNext from direct listener');
        onNext();
      }
    };
    
    button.addEventListener('click', handleClick, true); // Use capture phase
    return () => {
      button.removeEventListener('click', handleClick, true);
    };
  }, [isLastStep, onComplete, onNext]);

  // State to track the actual viewport-relative position - start with safe center position
  const [viewportPosition, setViewportPosition] = React.useState<{ top: string; left: string; transform: string }>(() => {
    if (typeof window !== 'undefined') {
      return {
        top: `${window.innerHeight / 2}px`,
        left: `${window.innerWidth / 2}px`,
        transform: 'translate(-50%, -50%)'
      };
    }
    return tooltipPosition;
  });

  // CRITICAL: After render, check actual position and force it into viewport
  React.useEffect(() => {
    if (!tooltipRef.current) {
      console.warn('[TutorialStep] enforceViewportBounds: tooltipRef.current is null');
      return;
    }

    const enforceViewportBounds = () => {
      const element = tooltipRef.current!;
      const rect = element.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 16;
      const tooltipWidth = rect.width || 384;
      const tooltipHeight = rect.height || 250;

      // Check if tooltip is way off screen or has invalid dimensions
      const isWayOffScreen = rect.top > viewportHeight || rect.top < -viewportHeight || 
                             rect.bottom > viewportHeight * 1.5 || rect.bottom < -viewportHeight ||
                             rect.width === 0 || rect.height === 0;

      // Check if tooltip needs adjustment
      const needsAdjustment = rect.top < padding || 
                              rect.bottom > viewportHeight - padding ||
                              rect.left < padding ||
                              rect.right > viewportWidth - padding;

      // Only log if there's an issue to reduce console spam
      if (isWayOffScreen || needsAdjustment) {
        console.log('[TutorialStep] enforceViewportBounds called:', {
          rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
          viewport: { width: viewportWidth, height: viewportHeight },
          currentPosition: viewportPosition,
        });
      }

      // If way off screen or invalid, force to center of viewport
      if (isWayOffScreen) {
        console.warn('[TutorialStep] Tooltip is way off screen, forcing to center:', {
          isWayOffScreen,
          rectTop: rect.top,
          viewportHeight,
          rectWidth: rect.width,
          rectHeight: rect.height,
        });
        const centerPos = {
          top: `${viewportHeight / 2}px`,
          left: `${viewportWidth / 2}px`,
          transform: 'translate(-50%, -50%)'
        };
        setViewportPosition(centerPos);
        console.log('[TutorialStep] Set to center position:', centerPos);
        return;
      }

      if (needsAdjustment) {
        console.log('[TutorialStep] Tooltip needs adjustment, enforcing viewport bounds');
        // Calculate safe position with AGGRESSIVE clamping
        let targetTop = rect.top;
        let targetLeft = rect.left;
        let targetTransform = tooltipPosition.transform;

        // AGGRESSIVE vertical clamping - ensure top >= padding
        if (rect.top < padding) {
          console.log('[TutorialStep] Clamping top:', rect.top, '->', padding);
          targetTop = padding;
          targetTransform = 'translate(-50%, 0)';
        }
        
        // AGGRESSIVE vertical clamping - ensure bottom <= viewportHeight - padding
        const calculatedBottom = targetTop + tooltipHeight;
        if (calculatedBottom > viewportHeight - padding) {
          console.log('[TutorialStep] Clamping bottom:', calculatedBottom, '->', viewportHeight - padding);
          const maxTop = Math.max(padding, viewportHeight - padding - tooltipHeight);
          targetTop = maxTop;
          targetTransform = 'translate(-50%, 0)';
        }
        
        // Double-check: ensure the entire tooltip is visible
        const finalTop = parseFloat(`${targetTop}`) || 0;
        const finalBottom = finalTop + tooltipHeight;
        if (finalBottom > viewportHeight - padding) {
          // Still off screen at bottom, force it to fit
          targetTop = Math.max(padding, viewportHeight - padding - tooltipHeight);
          targetTransform = 'translate(-50%, 0)';
        }
        if (finalTop < padding) {
          // Still off screen at top, force it to top
          targetTop = padding;
          targetTransform = 'translate(-50%, 0)';
        }

        // AGGRESSIVE horizontal clamping
        if (targetTransform.includes('translate(-50%')) {
          const centerX = targetLeft;
          const halfWidth = tooltipWidth / 2;
          const leftEdge = centerX - halfWidth;
          const rightEdge = centerX + halfWidth;
          
          // Ensure left edge >= padding
          if (leftEdge < padding) {
            console.log('[TutorialStep] Clamping left edge:', leftEdge, '->', padding);
            targetLeft = padding + halfWidth;
          }
          // Ensure right edge <= viewportWidth - padding
          else if (rightEdge > viewportWidth - padding) {
            console.log('[TutorialStep] Clamping right edge:', rightEdge, '->', viewportWidth - padding);
            targetLeft = viewportWidth - padding - halfWidth;
          }
        } else {
          // For other transforms, ensure left and right edges are visible
          if (rect.left < padding) {
            targetLeft = padding;
          }
          if (rect.right > viewportWidth - padding) {
            targetLeft = viewportWidth - padding - tooltipWidth;
          }
        }

        const adjustedPos = {
          top: `${targetTop}px`,
          left: `${targetLeft}px`,
          transform: targetTransform
        };
        console.log('[TutorialStep] Adjusted position:', adjustedPos);
        // Only update if position actually changed
        const currentTop = parseFloat(viewportPosition.top) || 0;
        const currentLeft = parseFloat(viewportPosition.left) || 0;
        if (Math.abs(currentTop - targetTop) > 1 || Math.abs(currentLeft - targetLeft) > 1 || viewportPosition.transform !== targetTransform) {
          setViewportPosition(adjustedPos);
        }
      } else {
        // Tooltip is fully visible, use calculated position from hook
        // Only update if position actually changed to avoid infinite loops
        const currentTop = parseFloat(viewportPosition.top) || 0;
        const currentLeft = parseFloat(viewportPosition.left) || 0;
        const calcTop = parseFloat(tooltipPosition.top) || 0;
        const calcLeft = parseFloat(tooltipPosition.left) || 0;
        
        // Only update if calculated position is significantly different (more than 10px)
        if (Math.abs(currentTop - calcTop) > 10 || Math.abs(currentLeft - calcLeft) > 10) {
          setViewportPosition(tooltipPosition);
        }
        // Otherwise keep current position to avoid unnecessary re-renders
      }
    };

    // Check immediately and after a delay to ensure it works
    enforceViewportBounds();
    const timeout1 = setTimeout(enforceViewportBounds, 0);
    const timeout2 = setTimeout(enforceViewportBounds, 50);
    const rafId = requestAnimationFrame(enforceViewportBounds);

    // Also check on scroll and resize (throttled)
    let scrollTimeout: NodeJS.Timeout | null = null;
    const throttledEnforce = () => {
      if (scrollTimeout) return;
      scrollTimeout = setTimeout(() => {
        enforceViewportBounds();
        scrollTimeout = null;
      }, 16); // ~60fps
    };

    window.addEventListener('scroll', throttledEnforce, true);
    window.addEventListener('resize', throttledEnforce);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      if (scrollTimeout) clearTimeout(scrollTimeout);
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', throttledEnforce, true);
      window.removeEventListener('resize', throttledEnforce);
    };
  }, [tooltipPosition]); // Remove viewportPosition from deps to prevent infinite loop

  // Always use viewport position (starts with safe center, then adjusts)
  const finalPosition = viewportPosition;

  // Reduced debug logging - only log on step changes or issues
  React.useEffect(() => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      const computed = window.getComputedStyle(tooltipRef.current);
      
      // Only log if there's a problem
      const isInViewport = rect.top >= 0 && rect.top < window.innerHeight && 
                          rect.left >= 0 && rect.left < window.innerWidth;
      
      if (!isInViewport || computed.position !== 'fixed') {
        console.warn('[TutorialStep] Issue detected:', {
          stepId: step.id,
          isInViewport,
          position: computed.position,
          rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
        });
      }
    }
  }, [step.id]); // Only log on step changes

  // For making-selection step, disable pointer events on tooltip to allow chart clicks
  const isMakingSelectionStep = step?.id === 'making-selection';
  
  return (
    <div
      ref={tooltipRef}
      className="fixed z-[10000] w-[calc(100vw-32px)] max-w-sm sm:max-w-md rounded-2xl sm:rounded-3xl overflow-hidden"
      style={{
        top: finalPosition.top,
        left: finalPosition.left,
        transform: finalPosition.transform,
        // CRITICAL: Disable pointer events on step 4 to allow chart clicks through
        pointerEvents: isMakingSelectionStep ? 'none' : 'auto',
        zIndex: 10001,
        visibility: 'visible',
        opacity: 1,
        display: 'block',
        position: 'fixed' as const,
        isolation: 'isolate',
        maxWidth: typeof window !== 'undefined' && window.innerWidth < 640 ? 'calc(100vw - 32px)' : '28rem',
      }}
      role="dialog"
      aria-labelledby="tutorial-title"
      aria-describedby="tutorial-content"
      data-tutorial-button="true"
      onClick={isMakingSelectionStep ? undefined : (e) => {
        // Prevent clicks on tooltip from propagating to overlay
        e.stopPropagation();
      }}
      onMouseDown={isMakingSelectionStep ? undefined : (e) => {
        // Ensure mouse events work and don't reach overlay
        e.stopPropagation();
      }}
    >
      <div 
        className="bg-soft-white/95 backdrop-blur-sm rounded-2xl sm:rounded-3xl border border-turquoise-200/60 shadow-2xl shadow-turquoise-950/20 p-4 sm:p-6 h-full" 
        style={{ 
          isolation: 'isolate',
        }}
      >
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
                  console.log('[TutorialStep] Next button clicked, isLastStep:', isLastStep);
                  // Call handlers directly
                  if (isLastStep) {
                    console.log('[TutorialStep] Calling onComplete');
                    onComplete();
                  } else {
                    console.log('[TutorialStep] Calling onNext');
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
                className="px-4 py-2 text-sm font-medium text-white bg-turquoise-600 hover:bg-turquoise-500 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-turquoise-500 cursor-pointer relative z-[10002]"
                aria-label={isLastStep ? 'Complete tutorial' : 'Next step'}
                type="button"
                style={{ 
                  pointerEvents: 'auto', 
                  zIndex: 10002, 
                  position: 'relative',
                  isolation: 'isolate',
                  touchAction: 'manipulation'
                }}
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


