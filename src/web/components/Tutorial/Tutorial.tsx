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

  // Calculate overlay clip-path to exclude chart area
  useEffect(() => {
    if (!isActive || !overlayRef.current) {
      if (overlayRef.current) {
        overlayRef.current.style.clipPath = '';
        overlayRef.current.style.webkitClipPath = '';
      }
      return;
    }
    
    const updateOverlayMask = () => {
      if (!overlayRef.current) return;

      // Always use lighter overlay so UI elements remain accessible
      overlayRef.current.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';

      const chartElement = document.querySelector('[data-tutorial-chart]');
      if (!chartElement) {
        // If no chart found, just use light overlay without clip-path
        overlayRef.current.style.clipPath = '';
        overlayRef.current.style.webkitClipPath = '';
        return;
      }

      const chartRect = chartElement.getBoundingClientRect();
      // Check if chart has valid dimensions
      if (chartRect.width === 0 || chartRect.height === 0) {
        overlayRef.current.style.clipPath = '';
        overlayRef.current.style.webkitClipPath = '';
        return;
      }

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Calculate percentages for clip-path
      const leftPct = (chartRect.left / viewportWidth) * 100;
      const rightPct = (chartRect.right / viewportWidth) * 100;
      const topPct = (chartRect.top / viewportHeight) * 100;
      const bottomPct = (chartRect.bottom / viewportHeight) * 100;

      // Create a polygon that covers everything except the chart area
      // This creates a "frame" around the chart by going around it
      // Clamp values to ensure they're within 0-100%
      const leftPctClamped = Math.max(0, Math.min(100, leftPct));
      const rightPctClamped = Math.max(0, Math.min(100, rightPct));
      const topPctClamped = Math.max(0, Math.min(100, topPct));
      const bottomPctClamped = Math.max(0, Math.min(100, bottomPct));

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
      overlayRef.current.style.webkitClipPath = clipPath;
    };
    
    // Small delay to ensure chart is rendered
    const timeoutId = setTimeout(updateOverlayMask, 100);
    
    const resizeObserver = new ResizeObserver(updateOverlayMask);
    const chartElement = document.querySelector('[data-tutorial-chart]');
    if (chartElement) {
      resizeObserver.observe(chartElement);
    }
    
    window.addEventListener('resize', updateOverlayMask);
    window.addEventListener('scroll', updateOverlayMask, true);
    
    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateOverlayMask);
      window.removeEventListener('scroll', updateOverlayMask, true);
      if (overlayRef.current) {
        overlayRef.current.style.clipPath = '';
        overlayRef.current.style.webkitClipPath = '';
      }
    };
  }, [isActive, tutorialState.currentStepIndex]);

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
    shouldShowTooltip: !tutorialState.hideTooltipOnStep4
  });


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
        onMouseDown={(e) => {
          const target = e.target as HTMLElement;
          
          // CRITICAL: For making-selection step, allow ALL chart clicks through
          if (tutorialState.currentStep?.id === 'making-selection') {
            const isChart = target.closest('[data-tutorial-chart]') || 
                           target.closest('svg') || 
                           target.tagName === 'svg' ||
                           target.closest('[data-tutorial-chart]') !== null;
            if (isChart) {
              // Don't prevent or stop - let it pass through completely
              return;
            }
          }
          
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
        onClick={(e) => {
          const target = e.target as HTMLElement;
          
          // CRITICAL: For making-selection step, allow ALL chart clicks through
          if (tutorialState.currentStep?.id === 'making-selection') {
            const isChart = target.closest('[data-tutorial-chart]') || 
                           target.closest('svg') || 
                           target.tagName === 'svg' ||
                           target.closest('[data-tutorial-chart]') !== null;
            if (isChart) {
              // Don't prevent or stop - let it pass through completely
              console.log('[Tutorial] Chart click allowed through overlay on making-selection step');
              return;
            }
          }
          
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
