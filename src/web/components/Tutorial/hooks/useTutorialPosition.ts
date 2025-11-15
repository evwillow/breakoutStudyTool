/**
 * @fileoverview Hook for managing tutorial tooltip and highlight positioning.
 * @module src/web/components/Tutorial/hooks/useTutorialPosition.ts
 * @dependencies React
 */
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
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
  const tooltipLockedRef = useRef<boolean>(false); // Lock tooltip position after initial load
  const lastTooltipPositionRef = useRef<{ top: string; left: string; transform: string } | null>(null);
  const selectionMadeOnStep4Ref = useRef<boolean>(false); // Track if selection was made on step 4 to prevent re-setting highlight

  const updateTooltipPosition = useCallback((skipHighlight: boolean = false) => {
    skipHighlightUpdateRef.current = skipHighlight;

    // CRITICAL: Check if selection was made on step 4 FIRST, before ANY other logic
    // If selection was made, ensure highlights are cleared and NEVER re-set
    if (currentStep?.id === 'making-selection' && selectionMadeOnStep4Ref.current) {
      console.log('[Tutorial Position] updateTooltipPosition called but selection already made on step 4, ensuring highlights cleared and skipping ALL highlight logic');
      // IMMEDIATELY clear highlights using flushSync to prevent any re-setting
      flushSync(() => {
        setSelectableAreaHighlight(null);
        setHighlightPosition(null);
      });
      lastHighlightPositionRef.current = null;
      highlightLockedRef.current = true;
      // Skip ALL subsequent highlight logic - only handle tooltip positioning if needed
      // For step 4, tooltip is hidden anyway, so we can return early
      return;
    }

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

    // Log step changes and unlock tooltip on step change
    const stepChanged = lastStepIdRef.current !== currentStep.id;
    if (stepChanged) {
      console.log('[Tutorial Position] ====== STEP CHANGED ======', 'new step:', currentStep.id);
      lastStepIdRef.current = currentStep.id;
      currentStepIdRef.current = currentStep.id; // Also update currentStepIdRef for highlight logic
      tooltipLockedRef.current = false; // Unlock tooltip on step change
      lastTooltipPositionRef.current = null;
      highlightLockedRef.current = false; // ALWAYS unlock highlight on step change

      // CRITICAL: Reset selection tracking when ENTERING step 4
      if (currentStep.id === 'making-selection') {
        console.log('[Tutorial Position] ====== ENTERING STEP 4: Resetting selectionMadeOnStep4Ref to FALSE ======');
        selectionMadeOnStep4Ref.current = false;
      }
    }

    if (currentStep.placement === 'center' || !currentStep.target) {
      // Calculate actual viewport center in pixels to ensure proper positioning
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const centerTop = viewportHeight / 2;
      const centerLeft = viewportWidth / 2;

      // Use pixel values for center positioning to avoid percentage calculation issues
      const centerPosition = {
        top: `${centerTop}px`,
        left: `${centerLeft}px`,
        transform: 'translate(-50%, -50%)'
      };
      
      // Check if position changed or step changed
      const centerPositionChanged = !lastTooltipPositionRef.current ||
        lastTooltipPositionRef.current.top !== centerPosition.top ||
        lastTooltipPositionRef.current.left !== centerPosition.left ||
        lastTooltipPositionRef.current.transform !== centerPosition.transform;
      
      // Update if step changed, not locked, or position changed
      if (stepChanged || !tooltipLockedRef.current || centerPositionChanged) {
        setTooltipPosition(centerPosition);
        lastTooltipPositionRef.current = centerPosition;
        if (!stepChanged) {
          tooltipLockedRef.current = true;
        }
      }
      
      setHighlightPosition(null);
      setSelectableAreaHighlight(null);
      return;
    }

    let targetElement = document.querySelector(currentStep.target);
    if (!targetElement) {
      console.warn(`[Tutorial Position] Target element not found: ${currentStep.target}, step: ${currentStep.id}`);
      // For step 5 (results-feedback), the element might not be ready yet after animation
      // Use center position as fallback - the useEffect will retry when element appears
      if (currentStep.id === 'results-feedback') {
        console.log('[Tutorial Position] Step 5 target element not found yet, using center position as fallback');
        // Don't lock tooltip position yet - allow retry when element appears
        setTooltipPosition({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
        setHighlightPosition(null);
        setSelectableAreaHighlight(null);
        return;
      }
      setTooltipPosition({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
      setHighlightPosition(null);
      setSelectableAreaHighlight(null);
      return;
    } else {
      console.log(`[Tutorial Position] Target element found for step ${currentStep.id}:`, currentStep.target);
    }

    // Special handling for making-selection step
    // Only set selectableAreaHighlight if not locked (i.e., selection hasn't been made yet)
    if (currentStep.id === 'making-selection') {
      // CRITICAL: Check if selection was made - if so, NEVER re-set highlight
      // Use both highlightLockedRef and selectionMadeOnStep4Ref for double-check
      console.log('[Tutorial Position] STEP 4: Checking locks - highlightLocked:', highlightLockedRef.current, 'selectionMade:', selectionMadeOnStep4Ref.current, 'skipHighlight:', skipHighlight);
      if (highlightLockedRef.current || selectionMadeOnStep4Ref.current) {
        console.log('[Tutorial Position] Step 4 selection already made (locked:', highlightLockedRef.current, 'selectionMade:', selectionMadeOnStep4Ref.current, '), ensuring highlights are cleared and NOT re-set');
        // Ensure it's cleared using direct state updates (immediate)
        // Use flushSync to force immediate update
        flushSync(() => {
          setSelectableAreaHighlight(null);
          setHighlightPosition(null);
        });
        lastHighlightPositionRef.current = null;
        // Don't proceed to set highlight - skip to tooltip positioning
        // Continue to tooltip positioning only (skip the else block)
      } else if (!skipHighlight) {
        // Only set highlight if skipHighlight is false AND selection hasn't been made
        console.log('[Tutorial Position] ====== STEP 4: Entering selectable area highlight block (skipHighlight:', skipHighlight, ') ======');
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

          console.log('[Tutorial Position] ====== STEP 4: SETTING SELECTABLE AREA HIGHLIGHT ======', {
            top: svgRect.top,
            left: svgRect.left + selectableStartX,
            width: selectableWidth,
            height: chartHeight,
            dividerX: dividerX,
            selectableStartX: selectableStartX
          });
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
      }
      // If selection was made, we've already cleared highlights above, so skip setting them
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
    // Reuse stepChanged from above - it's already checking if step changed
    // currentStepIdRef is already updated above when stepChanged is true
    if (stepChanged) {
      console.log('[Tutorial Position] Step changed, unlocking highlight:', currentStep.id);
      highlightLockedRef.current = false; // Unlock on step change
      // Clear previous highlight position on step change
      lastHighlightPositionRef.current = null;
    }
    
    // NEVER update highlight if it's locked - this is critical for stability
    // This check happens BEFORE any other logic to prevent any updates
    // This prevents updates from scroll, resize, intervals, or ResizeObserver
    if (highlightLockedRef.current) {
      console.log('[Tutorial Position] Highlight is locked, skipping ALL highlight updates');
      // Highlight is locked, skip ALL updates - don't update highlight at all
      // Continue to tooltip positioning only
    } else {
      // Additional safety: if skipHighlight is true, never update highlight
      if (skipHighlightUpdateRef.current) {
        console.log('[Tutorial Position] skipHighlight is true, skipping highlight update');
        // Continue to tooltip positioning
      } else {
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
            
            // Only update if position actually changed (to prevent unnecessary re-renders)
            const lastPos = lastHighlightPositionRef.current;
            const positionChanged = !lastPos || 
              lastPos.top !== clampedPos.top || 
              lastPos.left !== clampedPos.left || 
              lastPos.width !== clampedPos.width || 
              lastPos.height !== clampedPos.height;
            
            if (positionChanged) {
              // Update highlight and lock it - it will stay fixed after this
              lastHighlightPositionRef.current = clampedPos;
              setHighlightPosition(clampedPos);
              highlightLockedRef.current = true; // Lock after setting position
              console.log('[Tutorial Position] Highlight locked at position:', clampedPos, 'original:', highlightPos, 'step:', currentStep.id);
            } else {
              // Position hasn't changed, but lock it anyway to prevent future updates
              highlightLockedRef.current = true;
              console.log('[Tutorial Position] Highlight position unchanged, locking to prevent updates');
            }
          } else {
            // Element not visible, clear highlight
            if (highlightUpdateTimeoutRef.current) {
              clearTimeout(highlightUpdateTimeoutRef.current);
            }
            lastHighlightPositionRef.current = null;
            setHighlightPosition(null);
            // Don't lock when clearing - allow it to be set again if element becomes visible
          }
        }
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

    // AGGRESSIVE clamping to ensure tooltip is FULLY visible in viewport with 16px padding
    // Recalculate tooltip bounds after initial positioning
    let finalTooltipTop = tooltipTop;
    let finalTooltipBottom = tooltipBottom;
    let finalTooltipLeft = tooltipLeft;
    let finalTooltipRight = tooltipRight;
    let finalTop = top;
    let finalLeft = left;
    let finalTransform = transform;

    // AGGRESSIVE vertical clamping - ensure top >= padding (16px)
    if (finalTooltipTop < padding) {
      console.log('[Tutorial Position] Tooltip top is above viewport, clamping:', finalTooltipTop, '->', padding);
      finalTop = padding;
      finalTransform = 'translate(-50%, 0)';
      // Recalculate bounds
      finalTooltipTop = finalTop;
      finalTooltipBottom = finalTop + tooltipHeight;
      // Double-check bottom is still within bounds
      if (finalTooltipBottom > viewportHeight - padding) {
        finalTop = Math.max(padding, viewportHeight - padding - tooltipHeight);
        finalTooltipTop = finalTop;
        finalTooltipBottom = finalTop + tooltipHeight;
      }
    }

    // AGGRESSIVE vertical clamping - ensure bottom <= viewportHeight - padding (16px)
    if (finalTooltipBottom > viewportHeight - padding) {
      console.log('[Tutorial Position] Tooltip bottom is below viewport, clamping:', finalTooltipBottom, '->', viewportHeight - padding);
      const maxTop = Math.max(padding, viewportHeight - padding - tooltipHeight);
      finalTop = maxTop;
      finalTransform = 'translate(-50%, 0)';
      // Recalculate bounds
      finalTooltipTop = finalTop;
      finalTooltipBottom = finalTop + tooltipHeight;
      // Double-check top is still within bounds
      if (finalTooltipTop < padding) {
        finalTop = padding;
        finalTooltipTop = finalTop;
        finalTooltipBottom = finalTop + tooltipHeight;
      }
    }

    // AGGRESSIVE horizontal clamping - ensure left >= padding (16px)
    if (finalTooltipLeft < padding) {
      console.log('[Tutorial Position] Tooltip left is off-screen, clamping:', finalTooltipLeft, '->', padding);
      if (finalTransform.includes('translate(-50%')) {
        // Centered horizontally, adjust left to keep center but ensure left edge is visible
        finalLeft = padding + tooltipWidth / 2;
      } else if (finalTransform.includes('translate(-100%')) {
        // Left-aligned, move right
        finalLeft = padding + tooltipWidth;
      } else {
        // Right-aligned or no transform, move right
        finalLeft = padding;
      }
      // Recalculate bounds
      if (finalTransform.includes('translate(-50%')) {
        finalTooltipLeft = finalLeft - tooltipWidth / 2;
        finalTooltipRight = finalLeft + tooltipWidth / 2;
      } else if (finalTransform.includes('translate(-100%')) {
        finalTooltipLeft = finalLeft - tooltipWidth;
        finalTooltipRight = finalLeft;
      } else {
        finalTooltipLeft = finalLeft;
        finalTooltipRight = finalLeft + tooltipWidth;
      }
      // Double-check right edge is still within bounds
      if (finalTooltipRight > viewportWidth - padding) {
        if (finalTransform.includes('translate(-50%')) {
          finalLeft = viewportWidth - padding - tooltipWidth / 2;
          finalTooltipLeft = finalLeft - tooltipWidth / 2;
          finalTooltipRight = finalLeft + tooltipWidth / 2;
        } else {
          finalLeft = viewportWidth - padding - tooltipWidth;
          finalTooltipLeft = finalLeft;
          finalTooltipRight = finalLeft + tooltipWidth;
        }
      }
    }

    // AGGRESSIVE horizontal clamping - ensure right <= viewportWidth - padding (16px)
    if (finalTooltipRight > viewportWidth - padding) {
      console.log('[Tutorial Position] Tooltip right is off-screen, clamping:', finalTooltipRight, '->', viewportWidth - padding);
      if (finalTransform.includes('translate(-50%')) {
        // Centered horizontally, adjust left to keep center but ensure right edge is visible
        finalLeft = viewportWidth - padding - tooltipWidth / 2;
      } else if (finalTransform.includes('translate(-100%')) {
        // Left-aligned, move left
        finalLeft = viewportWidth - padding;
      } else {
        // Right-aligned or no transform, move left
        finalLeft = viewportWidth - padding - tooltipWidth;
      }
      // Recalculate bounds
      if (finalTransform.includes('translate(-50%')) {
        finalTooltipLeft = finalLeft - tooltipWidth / 2;
        finalTooltipRight = finalLeft + tooltipWidth / 2;
      } else if (finalTransform.includes('translate(-100%')) {
        finalTooltipLeft = finalLeft - tooltipWidth;
        finalTooltipRight = finalLeft;
      } else {
        finalTooltipLeft = finalLeft;
        finalTooltipRight = finalLeft + tooltipWidth;
      }
      // Double-check left edge is still within bounds
      if (finalTooltipLeft < padding) {
        if (finalTransform.includes('translate(-50%')) {
          finalLeft = padding + tooltipWidth / 2;
          finalTooltipLeft = finalLeft - tooltipWidth / 2;
          finalTooltipRight = finalLeft + tooltipWidth / 2;
        } else {
          finalLeft = padding;
          finalTooltipLeft = finalLeft;
          finalTooltipRight = finalLeft + tooltipWidth;
        }
      }
    }

    // Final validation - ensure all edges are within bounds
    if (finalTooltipTop < padding) {
      finalTop = padding;
      finalTransform = 'translate(-50%, 0)';
    }
    if (finalTooltipBottom > viewportHeight - padding) {
      finalTop = Math.max(padding, viewportHeight - padding - tooltipHeight);
      finalTransform = 'translate(-50%, 0)';
    }
    if (finalTooltipLeft < padding) {
      if (finalTransform.includes('translate(-50%')) {
        finalLeft = padding + tooltipWidth / 2;
      } else {
        finalLeft = padding;
      }
    }
    if (finalTooltipRight > viewportWidth - padding) {
      if (finalTransform.includes('translate(-50%')) {
        finalLeft = viewportWidth - padding - tooltipWidth / 2;
      } else {
        finalLeft = viewportWidth - padding - tooltipWidth;
      }
    }

    top = finalTop;
    left = finalLeft;
    transform = finalTransform;

    // Final validation - only fix truly invalid values (NaN, way out of bounds)
    let validTop = top;
    let validLeft = left;
    
    // Only fix if value is completely invalid (NaN or way out of reasonable bounds)
    if (isNaN(top) || top < -10000 || top > viewportHeight + 10000) {
      console.warn(`[Tutorial Position] Invalid top value: ${top}, using center fallback`);
      validTop = viewportHeight / 2;
      validLeft = viewportWidth / 2;
      transform = 'translate(-50%, -50%)';
    }
    
    if (isNaN(left) || left < -10000 || left > viewportWidth + 10000) {
      console.warn(`[Tutorial Position] Invalid left value: ${left}, using center fallback`);
      validTop = viewportHeight / 2;
      validLeft = viewportWidth / 2;
      transform = 'translate(-50%, -50%)';
    }

    const finalPosition = {
      top: `${validTop}px`,
      left: `${validLeft}px`,
      transform
    };
    
    // Lock tooltip position after initial calculation to prevent constant updates
    // Only update if position changed significantly or step changed or not locked yet
    const positionChanged = !lastTooltipPositionRef.current || 
      lastTooltipPositionRef.current.top !== finalPosition.top ||
      lastTooltipPositionRef.current.left !== finalPosition.left ||
      lastTooltipPositionRef.current.transform !== finalPosition.transform;
    
    // Always update if step changed, not locked yet, or position actually changed
    const shouldUpdate = stepChanged || !tooltipLockedRef.current || positionChanged;
    
    if (shouldUpdate) {
      // Log final position for debugging
      if (stepChanged || positionChanged) {
        console.log('[Tutorial Position] Setting tooltip position:', finalPosition, 'step:', currentStep.id, 'stepChanged:', stepChanged, 'positionChanged:', positionChanged);
      }
      
      setTooltipPosition(finalPosition);
      lastTooltipPositionRef.current = finalPosition;
      
      // Lock tooltip after setting position (unless step just changed)
      if (!stepChanged) {
        tooltipLockedRef.current = true;
        if (positionChanged) {
          console.log('[Tutorial Position] Tooltip position locked after update');
        }
      }
    } else {
      // Position is locked and hasn't changed - skip update to prevent jitter
      // This prevents constant re-renders from scroll/resize/intervals
    }
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
      // Reset locks when tutorial becomes inactive
      tooltipLockedRef.current = false;
      highlightLockedRef.current = false;
      selectionMadeOnStep4Ref.current = false;
      lastTooltipPositionRef.current = null;
      lastHighlightPositionRef.current = null;
    }
  }, [isActive]);

  // Update position on step change, scroll, and resize
  useEffect(() => {
    if (!isActive) return;

    // Immediately update position (including highlight and tooltip) on step change
    // Unlock both on step change
    tooltipLockedRef.current = false;
    highlightLockedRef.current = false;
    // CRITICAL: Reset selection tracking when step changes to making-selection
    // This ensures fresh state when entering step 4
    if (currentStep?.id === 'making-selection') {
      // Reset when entering step 4 to allow highlight to be set
      selectionMadeOnStep4Ref.current = false;
      highlightLockedRef.current = false;
    } else {
      // Clear when leaving step 4
      selectionMadeOnStep4Ref.current = false;
    }
    updateTooltipPosition(false); // Allow highlight update on initial load
    
    // Lock highlight and tooltip after a short delay to ensure they're set
    const lockTimeout = setTimeout(() => {
      if (!highlightLockedRef.current && currentStep && currentStep.id !== 'making-selection') {
        // Force lock if not already locked
        highlightLockedRef.current = true;
        console.log('[Tutorial Position] Highlight auto-locked after timeout');
      }
      if (!tooltipLockedRef.current && currentStep) {
        // Force lock tooltip if not already locked
        tooltipLockedRef.current = true;
        console.log('[Tutorial Position] Tooltip auto-locked after timeout');
      }
    }, 300);
    
    const timeoutId = setTimeout(() => {
      // Update again after delay, but skip highlight - it's already set and locked
      // Tooltip is also locked, so it won't update
      updateTooltipPosition(true);
    }, 200); // Delay to ensure DOM is fully ready
    
    // For step 5 (results-feedback), the results element might appear after animation
    // Add multiple retries to catch the element when it appears
    let resultsRetryTimeout: NodeJS.Timeout | null = null;
    let resultsRetryCount = 0;
    if (currentStep?.id === 'results-feedback') {
      console.log('[Tutorial Position] Step 5 detected, setting up retry mechanism for results element');
      const maxRetries = 10;
      const retryInterval = 200; // Check every 200ms
      
      const retryCheck = () => {
        const resultsElement = document.querySelector('[data-tutorial-results]');
        if (resultsElement) {
          console.log('[Tutorial Position] Results element found on retry attempt', resultsRetryCount, ', updating position');
          // Temporarily unlock tooltip and highlight to allow update
          tooltipLockedRef.current = false;
          highlightLockedRef.current = false;
          updateTooltipPosition(false); // Allow highlight update
          resultsRetryCount = 0; // Reset for next time
        } else {
          resultsRetryCount++;
          if (resultsRetryCount < maxRetries) {
            console.log('[Tutorial Position] Results element not found yet, retry', resultsRetryCount, 'of', maxRetries);
            resultsRetryTimeout = setTimeout(retryCheck, retryInterval);
          } else {
            console.warn('[Tutorial Position] Results element still not found after', maxRetries, 'retries');
            resultsRetryCount = 0; // Reset for next time
          }
        }
      };
      
      // Start first retry after a short delay
      resultsRetryTimeout = setTimeout(retryCheck, retryInterval);
    }

    const handleUpdate = (allowHighlight: boolean = false, forceTooltipUpdate: boolean = false) => {
      if (positionUpdateRef.current) {
        cancelAnimationFrame(positionUpdateRef.current);
      }
      positionUpdateRef.current = requestAnimationFrame(() => {
        // Temporarily unlock tooltip if force update is requested
        if (forceTooltipUpdate) {
          tooltipLockedRef.current = false;
        }
        updateTooltipPosition(!allowHighlight); // skipHighlight = !allowHighlight
      });
    };

    // For center-placed steps, only update on resize (not scroll)
    const handleResize = () => {
      // Don't update highlight on resize - it's locked after initial load
      // Only update tooltip position if it's not locked (e.g., viewport size changed significantly)
      // Force tooltip update on resize since viewport size changed
      handleUpdate(false, true); // Skip highlight, force tooltip update on resize
    };

    const handleScroll = () => {
      // Don't update position on scroll for center-placed or no-target steps
      if (currentStep && (currentStep.placement === 'center' || !currentStep.target)) {
        return;
      }
      // Don't update tooltip on scroll - it's locked after initial load
      // Tooltip position should stay fixed relative to viewport
      // Only update tooltip if it's not locked (shouldn't happen)
      handleUpdate(false, false); // Skip highlight, don't force tooltip update on scroll
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
    // Highlight is locked, so it won't update anyway, but explicitly skip it
    let resizeObserver: ResizeObserver | null = null;
    if (currentStep && currentStep.target && currentStep.placement !== 'center') {
      const targetElement = document.querySelector(currentStep.target);
      if (targetElement) {
        resizeObserver = new ResizeObserver(() => {
          // Only update tooltip position if not locked, NOT highlight
          // Highlight is locked, so it won't update anyway
          // Tooltip is also locked, so it won't update from ResizeObserver
          if (positionUpdateRef.current) {
            cancelAnimationFrame(positionUpdateRef.current);
          }
          positionUpdateRef.current = requestAnimationFrame(() => {
            // Don't force tooltip update - it's locked
            updateTooltipPosition(true); // Skip highlight updates
          });
        });
        resizeObserver.observe(targetElement);
      }
    }

    // Only run interval for tooltip positioning (not highlight) - highlight NEVER updates from interval
    // Highlight is locked, so it won't update anyway, but explicitly skip it
    let interval: NodeJS.Timeout | null = null;
    if (currentStep && currentStep.target && currentStep.placement !== 'center') {
      // Very long interval - only for tooltip, highlight NEVER updates from interval
      // Tooltip is also locked, so it won't update from interval
      interval = setInterval(() => {
        // Only update tooltip if not locked, not highlight - pass skipHighlight flag
        // Both highlight and tooltip are locked, so they won't update anyway
        if (positionUpdateRef.current) {
          cancelAnimationFrame(positionUpdateRef.current);
        }
        positionUpdateRef.current = requestAnimationFrame(() => {
          // Don't force tooltip update - it's locked
          updateTooltipPosition(true); // Skip highlight updates in interval
        });
      }, 2000); // Very long interval - 2 seconds
    }

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(lockTimeout);
      if (resultsRetryTimeout) {
        clearTimeout(resultsRetryTimeout);
        resultsRetryTimeout = null;
      }
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
    console.log('[Tutorial Position] clearHighlight called - clearing all highlights');
    // Use functional updates to ensure immediate clearing
    setHighlightPosition((prev) => {
      console.log('[Tutorial Position] Clearing highlightPosition, previous:', prev);
      return null;
    });
    setSelectableAreaHighlight((prev) => {
      console.log('[Tutorial Position] Clearing selectableAreaHighlight, previous:', prev);
      return null;
    });
    lastHighlightPositionRef.current = null;
    // Keep lock true to prevent any re-updates after clearing
    highlightLockedRef.current = true;
    console.log('[Tutorial Position] Highlights cleared, lock set to true to prevent re-updates');
  }, []);

  // Listen for selection made event to clear highlight on step 4
  // Use the existing currentStepIdRef to avoid stale closures
  useEffect(() => {
    if (!isActive) return;
    
    const handleSelection = () => {
      // Check current step using ref to avoid stale closure
      const stepId = currentStepIdRef.current;
      // Only clear if we're on making-selection step
      if (stepId === 'making-selection') {
        console.log('[Tutorial Position] Selection made event received on step 4, clearing highlight IMMEDIATELY');
        // CRITICAL: Set refs FIRST before any state updates to prevent race conditions
        selectionMadeOnStep4Ref.current = true;
        highlightLockedRef.current = true;
        // Clear highlights IMMEDIATELY using flushSync to force synchronous update
        flushSync(() => {
          setSelectableAreaHighlight(null);
          setHighlightPosition(null);
        });
        lastHighlightPositionRef.current = null;
        console.log('[Tutorial Position] Highlights cleared IMMEDIATELY after selection (flushSync, selectionMadeOnStep4Ref set to true)');
      } else {
        console.log('[Tutorial Position] Selection made event received but not on step 4, current step:', stepId);
      }
    };
    
    window.addEventListener('tutorial-selection-made', handleSelection, { capture: true });
    return () => {
      window.removeEventListener('tutorial-selection-made', handleSelection, { capture: true });
    };
  }, [isActive]);

  return {
    tooltipPosition,
    highlightPosition,
    selectableAreaHighlight,
    updatePosition: updateTooltipPosition,
    positionUpdateRef,
    clearHighlight,
  };
}

