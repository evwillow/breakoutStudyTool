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
}

export function useTutorialPosition(
  isActive: boolean,
  currentStep: TutorialStep | undefined,
  currentStepIndex: number
): UseTutorialPositionReturn {
  const [tooltipPosition, setTooltipPosition] = useState<{ top: string; left: string; transform: string }>({ 
    top: '50%', 
    left: '50%', 
    transform: 'translate(-50%, -50%)' 
  });
  const [highlightPosition, setHighlightPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [selectableAreaHighlight, setSelectableAreaHighlight] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const positionUpdateRef = useRef<number | null>(null);

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
        
        // Find the divider line (cyan vertical line) - it's the one that's vertical and in the right position
        const allLines = Array.from(svgElement.querySelectorAll('line'));
        let dividerLine: Element | null = null;
        let dividerX = 0;
        
        // Look for the cyan divider line (stroke="#00FFFF" or similar)
        for (const line of allLines) {
          const x1 = parseFloat(line.getAttribute('x1') || '0');
          const x2 = parseFloat(line.getAttribute('x2') || '0');
          const stroke = line.getAttribute('stroke') || '';
          const strokeWidth = parseFloat(line.getAttribute('strokeWidth') || '0');
          
          // Check if it's a vertical line (x1 === x2) and in the right position (70-80% of width)
          // Also check for cyan color or thick stroke (divider line)
          if (x1 === x2 && x1 > chartWidth * 0.65 && x1 < chartWidth * 0.85) {
            // Prefer cyan line, but accept any vertical line in the right range
            if (stroke.includes('00FFFF') || stroke.includes('cyan') || strokeWidth >= 2) {
              dividerLine = line;
              dividerX = x1;
              break;
            } else if (!dividerLine) {
              // Fallback to first vertical line in range
              dividerLine = line;
              dividerX = x1;
            }
          }
        }
        
        // If no divider line found, use the dashed line from PriceChart or calculate from data
        if (!dividerLine) {
          // Look for dashed line (the selectable area indicator)
          for (const line of allLines) {
            const strokeDasharray = line.getAttribute('stroke-dasharray') || line.getAttribute('strokeDasharray') || '';
            const x1 = parseFloat(line.getAttribute('x1') || '0');
            const x2 = parseFloat(line.getAttribute('x2') || '0');
            if (x1 === x2 && strokeDasharray && x1 > chartWidth * 0.65) {
              dividerX = x1;
              break;
            }
          }
        }
        
        // Fallback: use percentage if no line found
        if (dividerX === 0) {
          const isMobile = window.innerWidth < 768;
          const dividerPositionPercent = isMobile ? 0.70 : 0.75;
          dividerX = chartWidth * dividerPositionPercent;
        }
        
        // Calculate position relative to viewport
        const selectableStartX = dividerX;
        
        setSelectableAreaHighlight({
          top: svgRect.top,
          left: svgRect.left + selectableStartX,
          width: chartWidth - selectableStartX,
          height: chartHeight,
        });
        setHighlightPosition(null);
      } else {
        // Fallback if no SVG found
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
    
    if (currentStep.id !== 'making-selection') {
      setHighlightPosition({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
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
    let top = rect.top;
    let left = rect.left;
    let transform = '';
    let placement = preferredPlacement;

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
          // Ensure tooltip won't go off bottom of viewport
          if (top + tooltipHeight > viewportHeight - padding) {
            // Try placing above instead
            top = rect.top - 10;
            transform = 'translate(-50%, -100%)';
          }
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

    if (!foundValidPosition || placement !== 'center') {
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
      }

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

    // Ensure position values are valid (not NaN, not negative beyond reasonable bounds, not too large)
    // Calculate the actual tooltip bounds based on transform
    let actualTop = top;
    let actualBottom = top;
    let actualLeft = left;
    let actualRight = left;
    
    if (transform.includes('translate(-50%, -100%)')) {
      actualTop = top - tooltipHeight;
      actualBottom = top;
      actualLeft = left - tooltipWidth / 2;
      actualRight = left + tooltipWidth / 2;
    } else if (transform.includes('translate(-50%, 0)')) {
      actualTop = top;
      actualBottom = top + tooltipHeight;
      actualLeft = left - tooltipWidth / 2;
      actualRight = left + tooltipWidth / 2;
    } else if (transform.includes('translate(-100%, -50%)')) {
      actualTop = top - tooltipHeight / 2;
      actualBottom = top + tooltipHeight / 2;
      actualLeft = left - tooltipWidth;
      actualRight = left;
    } else if (transform.includes('translate(0, -50%)')) {
      actualTop = top - tooltipHeight / 2;
      actualBottom = top + tooltipHeight / 2;
      actualLeft = left;
      actualRight = left + tooltipWidth;
    } else {
      actualTop = top - tooltipHeight / 2;
      actualBottom = top + tooltipHeight / 2;
      actualLeft = left - tooltipWidth / 2;
      actualRight = left + tooltipWidth / 2;
    }
    
    // Adjust position if tooltip would go off-screen
    if (actualTop < padding) {
      top += (padding - actualTop);
    }
    if (actualBottom > viewportHeight - padding) {
      top -= (actualBottom - (viewportHeight - padding));
    }
    if (actualLeft < padding) {
      left += (padding - actualLeft);
    }
    if (actualRight > viewportWidth - padding) {
      left -= (actualRight - (viewportWidth - padding));
    }
    
    // Final validation - ensure values are reasonable and within viewport
    // For fixed positioning, values must be relative to viewport (0 to viewportHeight/viewportWidth)
    let validTop = top;
    let validLeft = left;
    
    // Check if values are completely invalid
    if (isNaN(top) || top < -1000 || top > viewportHeight + 1000) {
      validTop = viewportHeight / 2;
      transform = 'translate(-50%, -50%)';
    } else {
      // Clamp to viewport bounds
      validTop = Math.max(0, Math.min(top, viewportHeight));
    }
    
    if (isNaN(left) || left < -1000 || left > viewportWidth + 1000) {
      validLeft = viewportWidth / 2;
      transform = 'translate(-50%, -50%)';
    } else {
      // Clamp to viewport bounds
      validLeft = Math.max(0, Math.min(left, viewportWidth));
    }

    // Double-check: if position seems way off (more than 2x viewport height), use center
    if (validTop > viewportHeight * 2 || validTop < -viewportHeight) {
      validTop = viewportHeight / 2;
      validLeft = viewportWidth / 2;
      transform = 'translate(-50%, -50%)';
    }

    // Debug logging
    if (validTop > viewportHeight || validTop < 0) {
      console.warn(`[Tutorial] Invalid top position: ${validTop}px (viewport height: ${viewportHeight}px)`, {
        originalTop: top,
        rect: targetElement.getBoundingClientRect(),
        step: currentStep.id
      });
    }

    setTooltipPosition({ 
      top: `${validTop}px`, 
      left: `${validLeft}px`, 
      transform 
    });
  }, [currentStep]);

  // Reset position when tutorial becomes inactive
  useEffect(() => {
    if (!isActive) {
      setTooltipPosition({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
      setHighlightPosition(null);
      setSelectableAreaHighlight(null);
    }
  }, [isActive]);

  // Update position on step change, scroll, and resize
  useEffect(() => {
    if (!isActive) return;

    // Use a small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      updateTooltipPosition();
    }, 50); // Increased delay to ensure DOM is fully ready

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
    
    const interval = setInterval(handleUpdate, 100);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
      clearInterval(interval);
      if (positionUpdateRef.current) {
        cancelAnimationFrame(positionUpdateRef.current);
      }
    };
  }, [isActive, currentStepIndex, updateTooltipPosition]);

  return {
    tooltipPosition,
    highlightPosition,
    selectableAreaHighlight,
    updatePosition: updateTooltipPosition,
    positionUpdateRef,
  };
}

