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

  // Calculate overlay clip-path to exclude chart area and highlighted elements
  useEffect(() => {
    if (!isActive || !overlayRef.current) {
      if (overlayRef.current) {
        overlayRef.current.style.clipPath = '';
        (overlayRef.current.style as any).webkitClipPath = '';
      }
      return;
    }
    
    const updateOverlayMask = () => {
      if (!overlayRef.current) return;

      // Always use lighter overlay so UI elements remain accessible
      overlayRef.current.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Get chart element
      const chartElement = document.querySelector('[data-tutorial-chart]');
      const chartRect = chartElement ? chartElement.getBoundingClientRect() : null;
      
      // Get highlighted element (if any) - check both data attribute and actual highlight position
      const highlightElement = document.querySelector('[data-tutorial-highlight]');
      let highlightRect = highlightElement ? highlightElement.getBoundingClientRect() : null;
      
      // Also check if there's a highlight position from the position hook
      if (!highlightRect && position.highlightPosition) {
        highlightRect = {
          top: position.highlightPosition.top,
          left: position.highlightPosition.left,
          width: position.highlightPosition.width,
          height: position.highlightPosition.height,
          right: position.highlightPosition.left + position.highlightPosition.width,
          bottom: position.highlightPosition.top + position.highlightPosition.height,
        } as DOMRect;
      }
      
      // Get target element for current step (if it exists and is not the chart)
      let targetRect = null;
      if (tutorialState.currentStep?.target && tutorialState.currentStep.target !== '[data-tutorial-chart]') {
        const targetElement = document.querySelector(tutorialState.currentStep.target);
        if (targetElement) {
          // Include target element even if it's inside chart - we want to exclude it
          targetRect = targetElement.getBoundingClientRect();
        }
      }
      
      // Also get selectable area highlight if it exists (for step 4)
      let selectableAreaRect = null;
      if (position.selectableAreaHighlight) {
        selectableAreaRect = {
          top: position.selectableAreaHighlight.top,
          left: position.selectableAreaHighlight.left,
          width: position.selectableAreaHighlight.width,
          height: position.selectableAreaHighlight.height,
          right: position.selectableAreaHighlight.left + position.selectableAreaHighlight.width,
          bottom: position.selectableAreaHighlight.top + position.selectableAreaHighlight.height,
        } as DOMRect;
      }

      // If no elements to exclude, use full overlay
      if (!chartRect && !highlightRect && !targetRect && !selectableAreaRect) {
        overlayRef.current.style.clipPath = '';
        (overlayRef.current.style as any).webkitClipPath = '';
        return;
      }

      // Build exclusion rectangles - include all areas that should not be shaded
      const exclusions: Array<{ left: number; right: number; top: number; bottom: number }> = [];
      
      if (chartRect && chartRect.width > 0 && chartRect.height > 0) {
        exclusions.push({
          left: (chartRect.left / viewportWidth) * 100,
          right: (chartRect.right / viewportWidth) * 100,
          top: (chartRect.top / viewportHeight) * 100,
          bottom: (chartRect.bottom / viewportHeight) * 100,
        });
      }
      
      if (highlightRect && highlightRect.width > 0 && highlightRect.height > 0) {
        exclusions.push({
          left: (highlightRect.left / viewportWidth) * 100,
          right: (highlightRect.right / viewportWidth) * 100,
          top: (highlightRect.top / viewportHeight) * 100,
          bottom: (highlightRect.bottom / viewportHeight) * 100,
        });
      }
      
      if (selectableAreaRect && selectableAreaRect.width > 0 && selectableAreaRect.height > 0) {
        exclusions.push({
          left: (selectableAreaRect.left / viewportWidth) * 100,
          right: (selectableAreaRect.right / viewportWidth) * 100,
          top: (selectableAreaRect.top / viewportHeight) * 100,
          bottom: (selectableAreaRect.bottom / viewportHeight) * 100,
        });
      }
      
      if (targetRect && targetRect.width > 0 && targetRect.height > 0) {
        // Always add target element - it should not be shaded
        exclusions.push({
          left: (targetRect.left / viewportWidth) * 100,
          right: (targetRect.right / viewportWidth) * 100,
          top: (targetRect.top / viewportHeight) * 100,
          bottom: (targetRect.bottom / viewportHeight) * 100,
        });
      }

      // Calculate a bounding box that includes all exclusions
      if (exclusions.length > 0) {
        let minLeft = 100;
        let maxRight = 0;
        let minTop = 100;
        let maxBottom = 0;
        
        exclusions.forEach(ex => {
          minLeft = Math.min(minLeft, ex.left);
          maxRight = Math.max(maxRight, ex.right);
          minTop = Math.min(minTop, ex.top);
          maxBottom = Math.max(maxBottom, ex.bottom);
        });
        
        // Clamp values
        const leftPctClamped = Math.max(0, Math.min(100, minLeft));
        const rightPctClamped = Math.max(0, Math.min(100, maxRight));
        const topPctClamped = Math.max(0, Math.min(100, minTop));
        const bottomPctClamped = Math.max(0, Math.min(100, maxBottom));

        // Create clip-path that excludes the bounding box
        const clipPath = `polygon(
          0% 0%,
          0% 100%,
          ${leftPctClamped}% 100%,
          ${leftPctClamped}% ${bottomPctClamped}%,
          ${rightPctClamped}% ${bottomPctClamped}%,
          ${rightPctClamped}% ${topPctClamped}%,
          ${leftPctClamped}% ${topPctClamped}%,
          ${leftPctClamped}% 100%,
          100% 100%,
          100% 0%
        )`;

        overlayRef.current.style.clipPath = clipPath;
        (overlayRef.current.style as any).webkitClipPath = clipPath;
      } else {
        overlayRef.current.style.clipPath = '';
        (overlayRef.current.style as any).webkitClipPath = '';
      }
    };
    
    // Small delay to ensure elements are rendered
    const timeoutId = setTimeout(updateOverlayMask, 100);
    
    // Update overlay when highlight position changes
    const highlightObserver = new MutationObserver(updateOverlayMask);
    const highlightElement = document.querySelector('[data-tutorial-highlight]');
    if (highlightElement) {
      highlightObserver.observe(highlightElement, { attributes: true, attributeFilter: ['style'] });
    }
    
    const resizeObserver = new ResizeObserver(updateOverlayMask);
    const chartElement = document.querySelector('[data-tutorial-chart]');
    if (chartElement) {
      resizeObserver.observe(chartElement);
    }
    
    // Also observe target elements if they exist
    if (tutorialState.currentStep?.target) {
      const targetElement = document.querySelector(tutorialState.currentStep.target);
      if (targetElement && !targetElement.closest('[data-tutorial-chart]')) {
        resizeObserver.observe(targetElement);
      }
    }
    
    window.addEventListener('resize', updateOverlayMask);
    window.addEventListener('scroll', updateOverlayMask, true);
    
    // Update overlay when position changes
    const positionCheckInterval = setInterval(updateOverlayMask, 200);
    
    return () => {
      clearTimeout(timeoutId);
      clearInterval(positionCheckInterval);
      highlightObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateOverlayMask);
      window.removeEventListener('scroll', updateOverlayMask, true);
      if (overlayRef.current) {
        overlayRef.current.style.clipPath = '';
        (overlayRef.current.style as any).webkitClipPath = '';
      }
    };
    }, [isActive, tutorialState.currentStepIndex, tutorialState.currentStep?.target, position.highlightPosition, position.selectableAreaHighlight]);

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

  // Log hideTooltipOnStep4 changes for debugging
  useEffect(() => {
    console.log('[Tutorial] hideTooltipOnStep4 changed:', tutorialState.hideTooltipOnStep4, 'step:', tutorialState.currentStep?.id);
  }, [tutorialState.hideTooltipOnStep4, tutorialState.currentStep?.id]);

  // Add data attribute to body when tutorial is active and prevent scrolling
  useEffect(() => {
    if (isActive) {
      document.body.setAttribute('data-tutorial-active', 'true');
      // Prevent scrolling - DO NOT use position: fixed on body as it breaks fixed positioning!
      const originalOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;

      // Simply prevent overflow - this keeps fixed elements working correctly
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      return () => {
        document.body.removeAttribute('data-tutorial-active');
        // Restore scrolling
        document.body.style.overflow = originalOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
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

  // Debug: Log current step info
  console.log('[Tutorial] Rendering step:', {
    stepIndex: tutorialState.currentStepIndex,
    stepId: tutorialState.currentStep.id,
    hideTooltipOnStep4: tutorialState.hideTooltipOnStep4,
    shouldShowTooltip: !tutorialState.hideTooltipOnStep4,
    willRenderTooltip: !tutorialState.hideTooltipOnStep4
  });

  // CRITICAL: Log when tooltip is hidden on step 4
  if (tutorialState.currentStep.id === 'making-selection' && tutorialState.hideTooltipOnStep4) {
    // TOOLTIP HIDDEN ON STEP 4 (selection made)
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
      {/* Overlay - clip-path excludes chart area to prevent tinting */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[9998]"
        aria-hidden="true"
        data-tutorial-active="true"
        style={{
          // For making-selection step, disable pointer events so chart clicks work
          pointerEvents: tutorialState.currentStep?.id === 'making-selection' ? 'none' : 'auto',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          mixBlendMode: 'normal',
          // Clip-path will be set dynamically via useEffect
        }}
        onMouseDown={tutorialState.currentStep?.id === 'making-selection' ? undefined : (e) => {
          const target = e.target as HTMLElement;
          
          // Allow clicks on interactive elements to pass through
          const isChart = target.closest('[data-tutorial-chart]') || target.closest('svg') || target.tagName === 'svg';
          const isDialog = target.closest('[role="dialog"]');
          const isButton = target.tagName === 'BUTTON' || target.closest('button');
          const isLink = target.tagName === 'A' || target.closest('a');
          const isInput = target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA';
          const isHeader = target.closest('header') || target.closest('nav');
          const isChartChild = target.closest('[data-tutorial-chart]') !== null;

          // If clicking on interactive elements, let it through
          if (isChart || isChartChild || isDialog || isButton || isLink || isInput || isHeader) {
            e.stopPropagation();
            return;
          }

          // If clicking directly on overlay (not on any child), prevent it
          if (target === overlayRef.current || target === e.currentTarget) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          // Otherwise let it through
        }}
        onClick={tutorialState.currentStep?.id === 'making-selection' ? undefined : (e) => {
          const target = e.target as HTMLElement;
          
          // Allow clicks on interactive elements to pass through
          const isChart = target.closest('[data-tutorial-chart]') || target.closest('svg') || target.tagName === 'svg';
          const isDialog = target.closest('[role="dialog"]');
          const isButton = target.tagName === 'BUTTON' || target.closest('button');
          const isLink = target.tagName === 'A' || target.closest('a');
          const isInput = target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA';
          const isHeader = target.closest('header') || target.closest('nav');
          const isChartChild = target.closest('[data-tutorial-chart]') !== null;

          // If clicking on interactive elements, let it through
          if (isChart || isChartChild || isDialog || isButton || isLink || isInput || isHeader) {
            e.stopPropagation();
            return;
          }

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
          data-tutorial-highlight
          className="fixed pointer-events-none border-2 border-turquoise-500 rounded-lg shadow-2xl shadow-turquoise-500/50"
          style={{
            top: `${position.highlightPosition.top}px`,
            left: `${position.highlightPosition.left}px`,
            width: `${position.highlightPosition.width}px`,
            height: `${position.highlightPosition.height}px`,
            animation: 'pulse 2s ease-in-out infinite',
            filter: 'none',
            mixBlendMode: 'normal',
            backgroundColor: 'transparent',
            zIndex: 10002, // Above chart (9999) and can appear in front when needed
            position: 'fixed',
            isolation: 'isolate', // Create new stacking context
          }}
        />
      )}

      {/* Selectable area highlight for chart selection step */}
      {position.selectableAreaHighlight && (
        <div
          className="fixed z-[9999] pointer-events-none border-2 border-turquoise-500 rounded-lg shadow-2xl shadow-turquoise-500/50"
          style={{
            top: `${position.selectableAreaHighlight.top}px`,
            left: `${position.selectableAreaHighlight.left}px`,
            width: `${position.selectableAreaHighlight.width}px`,
            height: `${position.selectableAreaHighlight.height}px`,
            animation: 'pulse 2s ease-in-out infinite',
            filter: 'none',
            mixBlendMode: 'normal',
            backgroundColor: 'transparent',
          }}
        />
      )}

      {/* Tooltip - hide on step 4 after selection to show animation */}
      {!tutorialState.hideTooltipOnStep4 && (
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
      )}

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
        /* Prevent blur and color changes on chart and highlighted areas during tutorial */
        /* Use isolation to create a new stacking context and prevent backdrop blur */
        [data-tutorial-active] [data-tutorial-chart] {
          isolation: isolate !important;
          position: relative !important;
          z-index: 9999 !important;
          filter: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          color: inherit !important;
          background-color: inherit !important;
        }
        [data-tutorial-active] [data-tutorial-chart] * {
          filter: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          color: inherit !important;
          background-color: inherit !important;
        }
        [data-tutorial-active] [data-tutorial-results],
        [data-tutorial-active] [data-tutorial-results] *,
        [data-tutorial-active] [data-tutorial-timer],
        [data-tutorial-active] [data-tutorial-timer] *,
        [data-tutorial-active] [data-tutorial-next],
        [data-tutorial-active] [data-tutorial-next] *,
        [data-tutorial-active] [data-tutorial-button],
        [data-tutorial-active] [data-tutorial-button] *,
        [data-tutorial-active] [role="dialog"],
        [data-tutorial-active] [role="dialog"] * {
          filter: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          color: inherit !important;
          background-color: inherit !important;
        }
        /* Ensure tutorial tooltip itself is not blurred */
        [role="dialog"][data-tutorial-button],
        [role="dialog"][data-tutorial-button] * {
          filter: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          color: inherit !important;
          background-color: inherit !important;
        }
        /* Prevent overlay from changing colors of elements */
        [data-tutorial-active="true"] {
          mix-blend-mode: normal !important;
        }
        /* The overlay is rendered in a portal, so it's always visually on top */
        /* To prevent tinting, we need to ensure elements create their own stacking context */
        /* and use CSS to prevent the overlay's background from affecting them */
        body[data-tutorial-active] [data-tutorial-chart] {
          position: relative !important;
          z-index: 9999 !important;
          isolation: isolate !important;
          pointer-events: auto !important;
          transform: translateZ(0) !important;
          will-change: transform !important;
          /* Create a new stacking context that's above the overlay */
          background: transparent !important;
        }
        /* Ensure tutorial highlight can appear above chart when needed */
        body[data-tutorial-active] [data-tutorial-highlight] {
          z-index: 10002 !important;
          position: fixed !important;
        }
        /* Use box-shadow inset to "cut out" the overlay effect */
        body[data-tutorial-active] [data-tutorial-chart]::before {
          content: '' !important;
          position: absolute !important;
          inset: 0 !important;
          z-index: -1 !important;
          background: inherit !important;
          pointer-events: none !important;
        }
        body[data-tutorial-active] [data-tutorial-chart] svg,
        body[data-tutorial-active] [data-tutorial-chart] svg * {
          pointer-events: auto !important;
        }
        body[data-tutorial-active] [data-tutorial-results],
        body[data-tutorial-active] [data-tutorial-timer],
        body[data-tutorial-active] [data-tutorial-next] {
          position: relative !important;
          z-index: 9999 !important;
          pointer-events: auto !important;
          isolation: isolate !important;
        }
        body[data-tutorial-active] [role="dialog"] {
          z-index: 10001 !important;
        }
        /* Ensure tutorial tooltip uses fixed positioning */
        body[data-tutorial-active] [role="dialog"][data-tutorial-button] {
          position: fixed !important;
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
