/**
 * @fileoverview Hook for managing chart magnifier touch interactions.
 * @module src/web/components/UI/chartMagnifier/hooks/useChartMagnifierTouch.ts
 * @dependencies React, ../utils/magnifierUtils
 */
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  constrainPosition,
  getMagnifierRenderPosition,
  selectionToClientCoords,
  isInVolumeArea,
  type Position,
  type SelectionBounds,
} from '../utils/magnifierUtils';

interface UseChartMagnifierTouchProps {
  enabled: boolean;
  isMobile: boolean;
  magnifierRef: React.RefObject<HTMLDivElement | null>;
  chartElement: HTMLElement | null;
  selectionBounds: SelectionBounds | null;
  mainDataLength: number;
  magnifierSize: number;
  targetPosition: Position;
  magnifierRenderPos: Position;
  setTargetPosition: React.Dispatch<React.SetStateAction<Position>>;
  setMagnifierRenderPos: React.Dispatch<React.SetStateAction<Position>>;
  targetPositionRef: React.MutableRefObject<Position>;
  onSelection: ((event: { clientX: number; clientY: number; preventDefault: () => void; stopPropagation: () => void }) => void) | null;
}

interface UseChartMagnifierTouchReturn {
  isDragging: boolean;
  isDraggingMagnifierWidget: boolean;
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
  setIsDraggingMagnifierWidget: React.Dispatch<React.SetStateAction<boolean>>;
  makeSelection: () => boolean;
}

const MOVEMENT_THRESHOLD = 5; // Pixels of movement to consider it a drag (reduced for better responsiveness)
const MAX_TAP_DURATION = 300; // Max milliseconds for a tap

export function useChartMagnifierTouch({
  enabled,
  isMobile,
  magnifierRef,
  chartElement,
  selectionBounds,
  mainDataLength,
  magnifierSize,
  targetPosition,
  magnifierRenderPos,
  setTargetPosition,
  setMagnifierRenderPos,
  targetPositionRef,
  onSelection,
}: UseChartMagnifierTouchProps): UseChartMagnifierTouchReturn {
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingMagnifierWidget, setIsDraggingMagnifierWidget] = useState(false);
  const isDraggingMagnifierWidgetRef = useRef(false);
  const onSelectionRef = useRef(onSelection);
  const makeSelectionRef = useRef<(() => boolean) | null>(null);
  const lastTapPositionRef = useRef<Position | null>(null);
  const lastTapTimeRef = useRef(0);

  // Keep refs updated
  useEffect(() => {
    onSelectionRef.current = onSelection;
  }, [onSelection]);

  // Helper to safely prevent default only if event is cancelable
  const safePreventDefault = useCallback((e: TouchEvent | MouseEvent) => {
    if (e.cancelable !== false) {
      e.preventDefault();
    }
  }, []);

  // Helper function to make a selection at the current magnifier position
  const makeSelection = useCallback((): boolean => {
    if (!enabled) {
      console.log('[ChartMagnifier] Selection blocked - magnifier is disabled');
      return false;
    }

    try {
      if (!selectionBounds) {
        console.error('[ChartMagnifier] Cannot get selection bounds - selection failed');
        return false;
      }

      if (!onSelectionRef.current) {
        console.error('[ChartMagnifier] onSelection callback not available - selection failed');
        return false;
      }

      // Get selection position - use ref first (most up-to-date), then state, then fallback
      let selectionPos = targetPositionRef.current;
      if (!selectionPos || typeof selectionPos.x !== 'number' || typeof selectionPos.y !== 'number') {
        selectionPos = targetPosition;
      }
      if (!selectionPos || typeof selectionPos.x !== 'number' || typeof selectionPos.y !== 'number') {
        selectionPos = lastTapPositionRef.current || { x: selectionBounds.width * 0.85, y: selectionBounds.height * 0.5 };
      }

      // Ensure position is within bounds
      const constrainedPos = constrainPosition(
        selectionPos.x,
        selectionPos.y,
        selectionBounds,
        chartElement,
        mainDataLength
      );
      const clientCoords = selectionToClientCoords(constrainedPos.x, constrainedPos.y, selectionBounds);

      // Validate coordinates are valid numbers
      if (typeof clientCoords.x !== 'number' || typeof clientCoords.y !== 'number' ||
          isNaN(clientCoords.x) || isNaN(clientCoords.y)) {
        console.error('[ChartMagnifier] Invalid coordinates calculated:', clientCoords);
        return false;
      }

      // Prevent selection in volume area
      if (isInVolumeArea(clientCoords.y, selectionBounds)) {
        console.log('[ChartMagnifier] Selection blocked - in volume area');
        return false;
      }

      console.log('[ChartMagnifier] Making selection at:', {
        selectionPos: constrainedPos,
        clientCoords,
        targetPosition: targetPositionRef.current
      });

      const syntheticEvent = {
        clientX: clientCoords.x,
        clientY: clientCoords.y,
        preventDefault: () => {},
        stopPropagation: () => {},
      };

      // Call the selection callback with error handling
      try {
        if (typeof onSelectionRef.current === 'function') {
          console.log('[ChartMagnifier] Calling onSelection callback:', syntheticEvent);
          onSelectionRef.current(syntheticEvent);
          console.log('[ChartMagnifier] Selection callback called successfully');
        } else {
          console.error('[ChartMagnifier] onSelection is not a function:', typeof onSelectionRef.current);
          return false;
        }
      } catch (error) {
        console.error('[ChartMagnifier] Error calling selection callback:', error);
        return false;
      }

      // Reset after successful selection
      lastTapPositionRef.current = null;
      lastTapTimeRef.current = 0;
      return true;
    } catch (error) {
      console.error('[ChartMagnifier] Unexpected error in makeSelection:', error);
      return false;
    }
  }, [enabled, selectionBounds, chartElement, mainDataLength, targetPosition, targetPositionRef]);

  // Store makeSelection in ref so it can be accessed from other useEffects
  useEffect(() => {
    makeSelectionRef.current = makeSelection;
  }, [makeSelection]);

  // Removed layoutEffect - now we only update DOM during drag, and sync state after drag ends
  // This prevents conflicts between React renders and direct DOM manipulation

  // Handle touch events on magnifier itself - drag to move, tap to select
  useEffect(() => {
    if (!enabled || !magnifierRef.current || !isMobile) return;

    let touchStartTime = 0;
    let touchStartPos: Position | null = null;
    let magnifierStartPos: Position | null = null;
    let touchMoved = false;
    let activeTouchId: number | null = null;
    let isDraggingMagnifier = false;
    let selectionBoundsCache = selectionBounds;
    let hasDragged = false;

    const handleMagnifierTouchStart = (e: TouchEvent) => {
      if (!e.touches || e.touches.length === 0) return;

      const touch = e.touches[0];

      if (activeTouchId !== null && activeTouchId === touch.identifier) {
        return;
      }

      safePreventDefault(e);
      e.stopPropagation();

      touchStartTime = Date.now();
      touchMoved = false;
      touchStartPos = { x: touch.clientX, y: touch.clientY };
      activeTouchId = touch.identifier;
      isDraggingMagnifier = false;
      hasDragged = false;

      selectionBoundsCache = selectionBounds;

      if (magnifierRef.current && selectionBoundsCache) {
        const rect = magnifierRef.current.getBoundingClientRect();
        magnifierStartPos = {
          x: rect.left - selectionBoundsCache.left,
          y: rect.top - selectionBoundsCache.top,
        };
      }
    };

    const handleMagnifierTouchMove = (e: TouchEvent) => {
      if (activeTouchId === null) return;

      if (!e.touches || e.touches.length === 0) return;

      safePreventDefault(e);
      e.stopPropagation();

      let touch: Touch | null = null;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === activeTouchId) {
          touch = e.touches[i];
          break;
        }
      }

      if (!touch || !touchStartPos || !selectionBoundsCache) return;

      const dx = touch.clientX - touchStartPos.x;
      const dy = touch.clientY - touchStartPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (magnifierStartPos !== null && distance > MOVEMENT_THRESHOLD) {
        touchMoved = true;
        hasDragged = true;
        isDraggingMagnifier = true;

        // Set dragging state immediately for instant feedback (only once)
        if (!isDraggingMagnifierWidgetRef.current) {
          setIsDraggingMagnifierWidget(true);
          isDraggingMagnifierWidgetRef.current = true;
          setIsDragging(true);
        }

        // Calculate new position immediately (no RAF batching for ultra-smooth tracking)
        const newMagnifierX = magnifierStartPos.x + dx;
        const newMagnifierY = magnifierStartPos.y + dy;

        const newCenterX = newMagnifierX + magnifierSize / 2;
        const newCenterY = newMagnifierY + magnifierSize / 2;

        const constrainedTarget = constrainPosition(
          newCenterX,
          newCenterY,
          selectionBoundsCache,
          chartElement,
          mainDataLength
        );

        const constrainedRenderX = constrainedTarget.x - magnifierSize / 2;
        const constrainedRenderY = constrainedTarget.y - magnifierSize / 2;

        // CRITICAL: Only update refs during drag - NO state updates to prevent re-renders
        targetPositionRef.current = constrainedTarget;
        lastTapPositionRef.current = constrainedTarget;

        // CRITICAL: Update DOM directly for buttery smooth tracking (bypasses React render cycle)
        if (magnifierRef.current && selectionBoundsCache) {
          const left = selectionBoundsCache.left + constrainedRenderX;
          const top = selectionBoundsCache.top + constrainedRenderY;
          // Use left/top for positioning (transform is used for scale in MagnifierWidget)
          magnifierRef.current.style.left = `${left}px`;
          magnifierRef.current.style.top = `${top}px`;
        }
      }
    };

    const handleMagnifierTouchEnd = (e: TouchEvent) => {
      if (!e.changedTouches || e.changedTouches.length === 0) return;

      safePreventDefault(e);
      e.stopPropagation();

      let touch: Touch | null = null;
      if (activeTouchId !== null) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === activeTouchId) {
            touch = e.changedTouches[i];
            break;
          }
        }
      }

      if (!touch) {
        activeTouchId = null;
        setIsDragging(false);
        return;
      }

      const touchDuration = Date.now() - touchStartTime;
      const isTap = touchDuration < MAX_TAP_DURATION && !hasDragged;

      console.log('[ChartMagnifier] TouchEnd:', {
        hasDragged,
        isTap,
        touchDuration,
        touchMoved
      });

      if (isTap) {
        console.log('[ChartMagnifier] Tap detected - making selection');
        setTimeout(() => {
          const result = makeSelection();
          if (!result) {
            console.warn('[ChartMagnifier] Selection failed, retrying...');
            setTimeout(() => makeSelection(), 100);
          }
        }, 50);
      } else if (hasDragged) {
        console.log('[ChartMagnifier] Drag ended - updating state to match refs');
        // CRITICAL: After drag ends, sync state with refs for React consistency
        const finalPosition = targetPositionRef.current;
        if (finalPosition && selectionBoundsCache) {
          const finalRenderX = finalPosition.x - magnifierSize / 2;
          const finalRenderY = finalPosition.y - magnifierSize / 2;
          setMagnifierRenderPos({ x: finalRenderX, y: finalRenderY });
          setTargetPosition(finalPosition);
        }
      }

      activeTouchId = null;
      touchMoved = false;
      touchStartPos = null;
      magnifierStartPos = null;
      isDraggingMagnifier = false;
      hasDragged = false;
      setIsDragging(false);
      setIsDraggingMagnifierWidget(false);
      isDraggingMagnifierWidgetRef.current = false;
    };

    const handleMagnifierTouchCancel = () => {
      activeTouchId = null;
      touchMoved = false;
      touchStartPos = null;
      magnifierStartPos = null;
      isDraggingMagnifier = false;
      hasDragged = false;
      setIsDragging(false);
      setIsDraggingMagnifierWidget(false);
      isDraggingMagnifierWidgetRef.current = false;
    };

    const magnifierElement = magnifierRef.current;
    magnifierElement.addEventListener('touchstart', handleMagnifierTouchStart, { passive: false });
    magnifierElement.addEventListener('touchmove', handleMagnifierTouchMove, { passive: false });
    magnifierElement.addEventListener('touchend', handleMagnifierTouchEnd, { passive: false });
    magnifierElement.addEventListener('touchcancel', handleMagnifierTouchCancel, { passive: false });

    return () => {
      magnifierElement.removeEventListener('touchstart', handleMagnifierTouchStart);
      magnifierElement.removeEventListener('touchmove', handleMagnifierTouchMove);
      magnifierElement.removeEventListener('touchend', handleMagnifierTouchEnd);
      magnifierElement.removeEventListener('touchcancel', handleMagnifierTouchCancel);
    };
  }, [
    enabled,
    isMobile,
    chartElement,
    selectionBounds,
    mainDataLength,
    magnifierSize,
    targetPosition,
    magnifierRenderPos,
    setTargetPosition,
    setMagnifierRenderPos,
    targetPositionRef,
    makeSelection,
    magnifierRef,
    safePreventDefault,
  ]);

  return {
    isDragging,
    isDraggingMagnifierWidget,
    setIsDragging,
    setIsDraggingMagnifierWidget,
    makeSelection,
  };
}

