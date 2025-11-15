/**
 * @fileoverview Hook for managing tutorial tooltip and highlight positioning.
 * @module src/web/components/Tutorial/hooks/useTutorialPosition.ts
 * @dependencies React
 */
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import type { TutorialStep } from '../tutorialSteps';

export interface UseTutorialPositionReturn {
  tooltipPosition: { top: string; left: string; transform: string };
  highlightPosition: { top: number; left: number; width: number; height: number } | null;
  selectableAreaHighlight: { top: number; left: number; width: number; height: number } | null;
  updatePosition: () => void;
  positionUpdateRef: React.MutableRefObject<number | null>;
  clearHighlight: () => void;
}

export function useTutorialPosition(
  isActive: boolean,
  currentStep: TutorialStep | undefined,
  currentStepIndex: number
): UseTutorialPositionReturn {
  // Initialize with viewport center in pixels
  const getViewportCenter = () => {
    if (typeof window === 'undefined') {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
    return {
      top: `${window.innerHeight / 2}px`,
      left: `${window.innerWidth / 2}px`,
      transform: 'translate(-50%, -50%)'
    };
  };

  const [tooltipPosition, setTooltipPosition] = useState<{ top: string; left: string; transform: string }>(getViewportCenter());
  const [highlightPosition, setHighlightPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [selectableAreaHighlight, setSelectableAreaHighlight] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const positionUpdateRef = useRef<number | null>(null);
  const lastStepIdRef = useRef<string | undefined>(undefined);
  const highlightUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastHighlightPositionRef = useRef<{ top: number; left: number; width: number; height: number } | null>(null);
  const skipHighlightUpdateRef = useRef<boolean>(false);
  const highlightLockedRef = useRef<boolean>(false); // Lock highlight after initial load
  const currentStepIdRef = useRef<string | undefined>(undefined);

  const updateTooltipPosition = useCallback((skipHighlight: boolean = false) => {
    skipHighlightUpdateRef.current = skipHighlight;
    if (!currentStep) {
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      setTooltipPosition({
        top: `${viewportHeight / 2}px`,
        left: `${viewportWidth / 2}px`,
        transform: 'translate(-50%, -50%)'
      });
      setHighlightPosition(null);
      setSelectableAreaHighlight(null);
      return;
    }

    // Log step changes
    if (lastStepIdRef.current !== currentStep.id) {
      lastStepIdRef.current = currentStep.id;
    }

    if (currentStep.placement === 'center' || !currentStep.target) {
      // Calculate actual viewport center in pixels to ensure proper positioning
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const centerTop = viewportHeight / 2;
      const centerLeft = viewportWidth / 2;

      // Use pixel values for center positioning to avoid percentage calculation issues
      setTooltipPosition({
        top: `${centerTop}px`,
        left: `${centerLeft}px`,
        transform: 'translate(-50%, -50%)'
      });
      setHighlightPosition(null);
      setSelectableAreaHighlight(null);
      return;
    }

    const targetElement = document.querySelector(currentStep.target);
    if (!targetElement) {
      console.warn(`[Tutorial] Target element not found: ${currentStep.target}`);
      setTooltipPosition({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
      setHighlightPosition(null);
      setSelectableAreaHighlight(null);
      return;
    }

    // Special handling for making-selection step
    if (currentStep.id === 'making-selection') {
      const chartContainer = targetElement.closest('[data-tutorial-chart]') || targetElement;
      const chartRect = chartContainer.getBoundingClientRect();
      
      const svgElement = chartContainer.querySelector('svg');
      if (svgElement) {
        const svgRect = svgElement.getBoundingClientRect();
        const chartWidth = svgRect.width;
        const chartHeight = svgRect.height;
        
        // Find the divider line (cyan vertical line or dashed line)
        const allLines = Array.from(svgElement.querySelectorAll('line'));
        let dividerX = 0;

        // First, look for the cyan divider line (solid, thick, vertical)
        for (const line of allLines) {
          const x1 = parseFloat(line.getAttribute('x1') || '0');
          const x2 = parseFloat(line.getAttribute('x2') || '0');
          const stroke = line.getAttribute('stroke') || '';
          const strokeWidth = parseFloat(line.getAttribute('stroke-width') || line.getAttribute('strokeWidth') || '0');

          // Vertical line check
          if (Math.abs(x1 - x2) < 1 && x1 > chartWidth * 0.60 && x1 < chartWidth * 0.90) {
            // Prefer cyan (#00FFFF) line with thick stroke (>=2)
            if ((stroke.toLowerCase().includes('00ffff') || stroke.toLowerCase().includes('cyan')) && strokeWidth >= 2) {
              dividerX = x1;
              break;
            }
          }
        }

        // If no cyan line, look for dashed line (gray indicator)
        if (dividerX === 0) {
          for (const line of allLines) {
            const x1 = parseFloat(line.getAttribute('x1') || '0');
            const x2 = parseFloat(line.getAttribute('x2') || '0');
            const strokeDasharray = line.getAttribute('stroke-dasharray') || line.getAttribute('strokeDasharray') || '';

            // Vertical dashed line check
            if (Math.abs(x1 - x2) < 1 && strokeDasharray && x1 > chartWidth * 0.60) {
              dividerX = x1;
              break;
            }
          }
        }

        // Fallback: calculate based on screen size
        if (dividerX === 0) {
          const isMobile = window.innerWidth < 1024; // Match MOBILE_BREAKPOINT
          const dividerPositionPercent = isMobile ? 0.70 : 0.75;
          dividerX = chartWidth * dividerPositionPercent;
        }

        // Calculate selectable area - everything to the right of the divider
        const selectableStartX = dividerX;
        const selectableWidth = chartWidth - selectableStartX;

        setSelectableAreaHighlight({
          top: svgRect.top,
          left: svgRect.left + selectableStartX,
          width: selectableWidth,
          height: chartHeight,
        });
        setHighlightPosition(null);
      } else {
        // Fallback if no SVG found
        const isMobile = window.innerWidth < 1024;
        const dividerPositionPercent = isMobile ? 0.70 : 0.75;
        setSelectableAreaHighlight({
          top: chartRect.top,
          left: chartRect.left + (chartRect.width * dividerPositionPercent),
          width: chartRect.width * (1 - dividerPositionPercent),
          height: chartRect.height,
        });
        setHighlightPosition(null);
      }
    } else {
      setSelectableAreaHighlight(null);
    }

    const rect = targetElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = 384;
    const tooltipHeight = 250;
    const padding = 16;

    // Check if element is actually visible in viewport
    // If rect is completely off-screen or has invalid dimensions, fall back to center
    if ((rect.width === 0 && rect.height === 0) || 
        rect.top > viewportHeight || 
        rect.bottom < 0 || 
        rect.left > viewportWidth || 
        rect.right < 0) {
      // Element is not visible in viewport, fall back to center
      setTooltipPosition({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
      return;
    }
    
    // Only update highlight if:
    // 1. Not skipped (e.g., when called from interval)
    // 2. Not locked (locked after initial load)
    // 3. Step changed (unlock on new step)
    const stepChanged = currentStepIdRef.current !== currentStep.id;
    if (stepChanged) {
      highlightLockedRef.current = false; // Unlock on step change
      currentStepIdRef.current = currentStep.id;
      // Clear previous highlight position on step change
      lastHighlightPositionRef.current = null;
    }
    
    // NEVER update highlight if it's locked - this is critical for stability
    // This check happens BEFORE any other logic to prevent any updates
    if (highlightLockedRef.current) {
      // Highlight is locked, skip ALL updates - return immediately
      return;
    }
    
    // Additional safety: if skipHighlight is true, never update highlight
    if (skipHighlightUpdateRef.current) {
      return;
    }
    
    // Only update highlight for non-making-selection steps
    if (currentStep.id !== 'making-selection') {
      // Only set highlight if element is actually visible and has valid dimensions
      if (rect.width > 0 && rect.height > 0 && 
          rect.top < viewportHeight && 
          rect.bottom > 0 && 
          rect.left < viewportWidth && 
          rect.right > 0) {
        // Ensure highlight position is valid and within viewport
        // getBoundingClientRect() gives viewport-relative coords, perfect for position:fixed
        const highlightPos = {
          top: Math.round(rect.top), // Round to avoid sub-pixel jitter
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
        
        // Clamp highlight to viewport bounds to ensure it stays on screen
        const clampedPos = {
          top: Math.max(0, Math.min(highlightPos.top, viewportHeight - highlightPos.height)),
          left: Math.max(0, Math.min(highlightPos.left, viewportWidth - highlightPos.width)),
          width: highlightPos.width,
          height: highlightPos.height,
        };
        
        // Update highlight and lock it - it will stay fixed after this
        lastHighlightPositionRef.current = clampedPos;
        setHighlightPosition(clampedPos);
        highlightLockedRef.current = true; // Lock after setting position
        console.log('[Tutorial Position] Highlight locked at position:', clampedPos, 'original:', highlightPos);
      } else {
        // Element not visible, clear highlight
        if (highlightUpdateTimeoutRef.current) {
          clearTimeout(highlightUpdateTimeoutRef.current);
        }
        lastHighlightPositionRef.current = null;
        setHighlightPosition(null);
      }
    }

    const fitsInViewport = (top: number, left: number, transform: string): boolean => {
      let tooltipTop = top;
      let tooltipLeft = left;
      let tooltipRight = left;
      let tooltipBottom = top;

      if (transform.includes('translate(-50%, -100%)')) {
        tooltipTop = top - tooltipHeight;
        tooltipBottom = top;
        tooltipLeft = left - tooltipWidth / 2;
        tooltipRight = left + tooltipWidth / 2;
      } else if (transform.includes('translate(-50%, 0)')) {
        tooltipTop = top;
        tooltipBottom = top + tooltipHeight;
        tooltipLeft = left - tooltipWidth / 2;
        tooltipRight = left + tooltipWidth / 2;
      } else if (transform.includes('translate(-100%, -50%)')) {
        tooltipTop = top - tooltipHeight / 2;
        tooltipBottom = top + tooltipHeight / 2;
        tooltipLeft = left - tooltipWidth;
        tooltipRight = left;
      } else if (transform.includes('translate(0, -50%)')) {
        tooltipTop = top - tooltipHeight / 2;
        tooltipBottom = top + tooltipHeight / 2;
        tooltipLeft = left;
        tooltipRight = left + tooltipWidth;
      } else {
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

    const preferredPlacement = currentStep.placement || 'bottom';
    let top = 0;
    let left = 0;
    let transform = '';
    let placement = preferredPlacement;

    // Calculate position based on preferred placement
    const calculatePosition = (tryPlacement: string) => {
      switch (tryPlacement) {
        case 'top':
          return {
            top: rect.top - 10,
            left: rect.left + rect.width / 2,
            transform: 'translate(-50%, -100%)'
          };
        case 'bottom':
          return {
            top: rect.bottom + 10,
            left: rect.left + rect.width / 2,
            transform: 'translate(-50%, 0)'
          };
        case 'left':
          return {
            top: rect.top + rect.height / 2,
            left: rect.left - 10,
            transform: 'translate(-100%, -50%)'
          };
        case 'right':
          return {
            top: rect.top + rect.height / 2,
            left: rect.right + 10,
            transform: 'translate(0, -50%)'
          };
        case 'center':
          return {
            top: viewportHeight / 2,
            left: viewportWidth / 2,
            transform: 'translate(-50%, -50%)'
          };
        default:
          return {
            top: rect.bottom + 10,
            left: rect.left + rect.width / 2,
            transform: 'translate(-50%, 0)'
          };
      }
    };

    const placementOrder = 
      preferredPlacement === 'top' ? ['top', 'bottom', 'right', 'left', 'center'] :
      preferredPlacement === 'bottom' ? ['bottom', 'top', 'right', 'left', 'center'] :
      preferredPlacement === 'left' ? ['left', 'right', 'bottom', 'top', 'center'] :
      preferredPlacement === 'right' ? ['right', 'left', 'bottom', 'top', 'center'] :
      ['bottom', 'top', 'right', 'left', 'center'];

    // Try each placement until we find one that fits
    let foundValidPosition = false;
    for (const tryPlacement of placementOrder) {
      const pos = calculatePosition(tryPlacement);
      top = pos.top;
      left = pos.left;
      transform = pos.transform;
      
      if (fitsInViewport(top, left, transform)) {
        placement = tryPlacement;
        foundValidPosition = true;
        break;
      }
    }

    // If no placement fits perfectly, use the preferred one and adjust minimally
    if (!foundValidPosition) {
      const pos = calculatePosition(preferredPlacement);
      top = pos.top;
      left = pos.left;
      transform = pos.transform;
      placement = preferredPlacement;
    }

    // Calculate actual tooltip bounds
    let tooltipTop = top;
    let tooltipBottom = top;
    let tooltipLeft = left;
    let tooltipRight = left;

    if (transform.includes('translate(-50%, -100%)')) {
      tooltipTop = top - tooltipHeight;
      tooltipBottom = top;
      tooltipLeft = left - tooltipWidth / 2;
      tooltipRight = left + tooltipWidth / 2;
    } else if (transform.includes('translate(-50%, 0)')) {
      tooltipTop = top;
      tooltipBottom = top + tooltipHeight;
      tooltipLeft = left - tooltipWidth / 2;
      tooltipRight = left + tooltipWidth / 2;
    } else if (transform.includes('translate(-100%, -50%)')) {
      tooltipTop = top - tooltipHeight / 2;
      tooltipBottom = top + tooltipHeight / 2;
      tooltipLeft = left - tooltipWidth;
      tooltipRight = left;
    } else if (transform.includes('translate(0, -50%)')) {
      tooltipTop = top - tooltipHeight / 2;
      tooltipBottom = top + tooltipHeight / 2;
      tooltipLeft = left;
      tooltipRight = left + tooltipWidth;
    } else {
      tooltipTop = top - tooltipHeight / 2;
      tooltipBottom = top + tooltipHeight / 2;
      tooltipLeft = left - tooltipWidth / 2;
      tooltipRight = left + tooltipWidth / 2;
    }

    // Only make minimal adjustments to keep tooltip in viewport
    // Don't override the positioning - just nudge if needed
    if (tooltipLeft < padding) {
      left += (padding - tooltipLeft);
    }
    if (tooltipRight > viewportWidth - padding) {
      left -= (tooltipRight - (viewportWidth - padding));
    }
    
    // For vertical, ALWAYS ensure tooltip is FULLY visible
    // This is critical for when scrolled to top - tooltips must stay in viewport
    if (tooltipTop < padding) {
      // Tooltip is above viewport - force it to be visible
      top = padding;
      transform = 'translate(-50%, 0)';
      // Recalculate tooltipBottom after adjusting top
      tooltipBottom = top + tooltipHeight;
    }

    if (tooltipBottom > viewportHeight - padding) {
      // Tooltip is below viewport - force it to fit
      // Calculate where the top should be to fit the bottom at padding
      const maxTop = viewportHeight - padding - tooltipHeight;
      if (maxTop >= padding) {
        top = maxTop;
        transform = 'translate(-50%, 0)';
      } else {
        // If tooltip is taller than viewport, position at top (it will cover things but be visible)
        top = padding;
        transform = 'translate(-50%, 0)';
      }
      // Recalculate to ensure it's correct
      tooltipBottom = top + tooltipHeight;
    }
    
    // Final check: ensure entire tooltip is within viewport bounds
    if (top < padding) {
      top = padding;
      transform = 'translate(-50%, 0)';
    }
    if (top + tooltipHeight > viewportHeight - padding) {
      top = Math.max(padding, viewportHeight - padding - tooltipHeight);
      transform = 'translate(-50%, 0)';
    }

    // Final validation - only fix truly invalid values (NaN, way out of bounds)
    // Don't clamp valid positions - the transform and previous adjustments handle viewport bounds
    let validTop = top;
    let validLeft = left;
    
    // Only fix if value is completely invalid (NaN or way out of reasonable bounds)
    if (isNaN(top) || top < -10000 || top > viewportHeight + 10000) {
      console.warn(`[Tutorial] Invalid top value: ${top}, using center fallback`);
      validTop = viewportHeight / 2;
      validLeft = viewportWidth / 2;
      transform = 'translate(-50%, -50%)';
    } else {
      validTop = top; // Use the calculated position as-is
    }
    
    if (isNaN(left) || left < -10000 || left > viewportWidth + 10000) {
      console.warn(`[Tutorial] Invalid left value: ${left}, using center fallback`);
      validTop = viewportHeight / 2;
      validLeft = viewportWidth / 2;
      transform = 'translate(-50%, -50%)';
    } else {
      validLeft = left; // Use the calculated position as-is
    }

    const finalPosition = {
      top: `${validTop}px`,
      left: `${validLeft}px`,
      transform
    };

    // Only log position changes, not every update
    if (lastStepIdRef.current !== currentStep.id) {
      console.log('[Tutorial Position] Final position for step', currentStep.id, ':', finalPosition, 'viewport:', { width: viewportWidth, height: viewportHeight });
    }

    setTooltipPosition(finalPosition);
  }, [currentStep]);

  // Reset position when tutorial becomes inactive
  useEffect(() => {
    if (!isActive) {
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      setTooltipPosition({
        top: `${viewportHeight / 2}px`,
        left: `${viewportWidth / 2}px`,
        transform: 'translate(-50%, -50%)'
      });
      setHighlightPosition(null);
      setSelectableAreaHighlight(null);
    }
  }, [isActive]);

  // Update position on step change, scroll, and resize
  useEffect(() => {
    if (!isActive) return;

    // Immediately update position (including highlight) on step change
    updateTooltipPosition(false); // Allow highlight update on initial load
    
    // Lock highlight after a short delay to ensure it's set
    const lockTimeout = setTimeout(() => {
      if (!highlightLockedRef.current && currentStep && currentStep.id !== 'making-selection') {
        // Force lock if not already locked
        highlightLockedRef.current = true;
        console.log('[Tutorial Position] Highlight auto-locked after timeout');
      }
    }, 300);
    
    const timeoutId = setTimeout(() => {
      // Update again after delay, but skip highlight - it's already set and locked
      updateTooltipPosition(true);
    }, 200); // Delay to ensure DOM is fully ready

    const handleUpdate = (allowHighlight: boolean = false) => {
      if (positionUpdateRef.current) {
        cancelAnimationFrame(positionUpdateRef.current);
      }
      positionUpdateRef.current = requestAnimationFrame(() => {
        updateTooltipPosition(!allowHighlight); // skipHighlight = !allowHighlight
      });
    };

    // For center-placed steps, only update on resize (not scroll)
    const handleResize = () => {
      // Allow highlight update on resize (user action)
      handleUpdate(true);
    };

    const handleScroll = () => {
      // Don't update position on scroll for center-placed or no-target steps
      if (currentStep && (currentStep.placement === 'center' || !currentStep.target)) {
        return;
      }
      // Update tooltip on scroll, but NOT highlight - highlight should stay fixed
      handleUpdate(false); // Skip highlight on scroll
    };

    // Throttle scroll/resize handlers to prevent excessive updates
    let scrollTimeout: NodeJS.Timeout | null = null;
    let resizeTimeout: NodeJS.Timeout | null = null;
    
    const throttledHandleScroll = () => {
      if (scrollTimeout) return;
      scrollTimeout = setTimeout(() => {
        handleScroll();
        scrollTimeout = null;
      }, 100); // 100ms throttle
    };
    
    const throttledHandleResize = () => {
      if (resizeTimeout) return;
      resizeTimeout = setTimeout(() => {
        handleResize();
        resizeTimeout = null;
      }, 200); // 200ms throttle for resize
    };

    window.addEventListener('scroll', throttledHandleScroll, true);
    window.addEventListener('resize', throttledHandleResize);

    // DO NOT use ResizeObserver for highlight - it triggers too frequently
    // Only use it for tooltip if needed, but skip highlight updates
    let resizeObserver: ResizeObserver | null = null;
    if (currentStep && currentStep.target && currentStep.placement !== 'center') {
      const targetElement = document.querySelector(currentStep.target);
      if (targetElement) {
        resizeObserver = new ResizeObserver(() => {
          // Only update tooltip position, NOT highlight
          if (positionUpdateRef.current) {
            cancelAnimationFrame(positionUpdateRef.current);
          }
          positionUpdateRef.current = requestAnimationFrame(() => {
            updateTooltipPosition(true); // Skip highlight updates
          });
        });
        resizeObserver.observe(targetElement);
      }
    }

    // Only run interval for tooltip positioning (not highlight) - highlight updates on scroll/resize only
    let interval: NodeJS.Timeout | null = null;
    if (currentStep && currentStep.target && currentStep.placement !== 'center') {
      // Very long interval - only for tooltip, highlight NEVER updates from interval
      interval = setInterval(() => {
        // Only update tooltip, not highlight - pass skipHighlight flag
        if (positionUpdateRef.current) {
          cancelAnimationFrame(positionUpdateRef.current);
        }
        positionUpdateRef.current = requestAnimationFrame(() => {
          updateTooltipPosition(true); // Skip highlight updates in interval
        });
      }, 2000); // Very long interval - 2 seconds
    }

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(lockTimeout);
      if (scrollTimeout) clearTimeout(scrollTimeout);
      if (resizeTimeout) clearTimeout(resizeTimeout);
      window.removeEventListener('scroll', throttledHandleScroll, true);
      window.removeEventListener('resize', throttledHandleResize);
      if (interval) {
        clearInterval(interval);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (positionUpdateRef.current) {
        cancelAnimationFrame(positionUpdateRef.current);
      }
      if (highlightUpdateTimeoutRef.current) {
        clearTimeout(highlightUpdateTimeoutRef.current);
      }
    };
  }, [isActive, currentStepIndex, currentStep, updateTooltipPosition]);

  // Expose a function to clear highlight (for step 4 after selection)
  const clearHighlight = useCallback(() => {
    console.log('[Tutorial Position] Clearing highlight');
    setHighlightPosition(null);
    setSelectableAreaHighlight(null);
    lastHighlightPositionRef.current = null;
    highlightLockedRef.current = false;
  }, []);

  // Listen for selection made event to clear highlight on step 4
  useEffect(() => {
    if (!isActive) return;
    
    const handleSelection = () => {
      // Only clear if we're on making-selection step
      if (currentStep?.id === 'making-selection') {
        console.log('[Tutorial Position] Selection made, clearing highlight');
        clearHighlight();
      }
    };
    
    window.addEventListener('tutorial-selection-made', handleSelection, { capture: true });
    return () => {
      window.removeEventListener('tutorial-selection-made', handleSelection, { capture: true });
    };
  }, [isActive, currentStep?.id, clearHighlight]);

  return {
    tooltipPosition,
    highlightPosition,
    selectableAreaHighlight,
    updatePosition: updateTooltipPosition,
    positionUpdateRef,
    clearHighlight,
  };
}

