"use client";
/**
 * @fileoverview Provides a magnifier overlay for selecting points on the stock chart.
 * @module src/web/components/UI/ChartMagnifier.js
 * @dependencies React
 */
import React, { useEffect, useRef, useState } from 'react';

const ChartMagnifier = ({ 
  onSelection, 
  enabled = true,
  magnifierSize = 160,
  zoomLevel = 2.5,
  chartElement = null,
  mainDataLength = 0 // Number of main data points (to calculate separator position)
}) => {
  // Position state: {x, y} in selection-area-relative coordinates (0 to width/height)
  // targetPosition: where the magnifier is looking at (center point in chart)
  // magnifierRenderPos: where the magnifier widget is rendered (can be dragged freely)
  const [targetPosition, setTargetPosition] = useState({ x: 0, y: 0 });
  const [magnifierRenderPos, setMagnifierRenderPos] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingMagnifierWidget, setIsDraggingMagnifierWidget] = useState(false);
  const [hasBeenPositioned, setHasBeenPositioned] = useState(false);
  // Always active - removed activation state
  const magnifierRef = useRef(null);
  const magnifiedContentRef = useRef(null);
  const chartCloneRef = useRef(null);
  const touchStartTimeRef = useRef(0);
  const activeTouchIdRef = useRef(null);
  const lastTapPositionRef = useRef(null);
  const lastTapTimeRef = useRef(0);
  const hasPositionedRef = useRef(false);
  const onSelectionRef = useRef(onSelection);
  const isDraggingMagnifierWidgetRef = useRef(false);
  const targetPositionRef = useRef({ x: 0, y: 0 });
  const makeSelectionRef = useRef(null); // Ref to store makeSelection function for cross-scope access
  
  // Helper to safely prevent default only if event is cancelable
  const safePreventDefault = (e) => {
    if (e.cancelable !== false) {
      e.preventDefault();
    }
  };
  
  // Keep onSelection ref updated
  useEffect(() => {
    onSelectionRef.current = onSelection;
  }, [onSelection]);
  
  // Keep targetPosition ref updated so event handlers always have latest value
  useEffect(() => {
    targetPositionRef.current = targetPosition;
  }, [targetPosition]);

  // Calculate selection area bounds (price chart area, excluding volume)
  const getSelectionAreaBounds = () => {
    if (!chartElement) return null;
    const rect = chartElement.getBoundingClientRect();
    // Volume is typically 25% of chart height on mobile, so selection area is top 75%
    const volumePercentage = 0.25;
    const selectionAreaHeight = rect.height * (1 - volumePercentage);
    
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.top + selectionAreaHeight,
      width: rect.width,
      height: selectionAreaHeight,
    };
  };

  // Calculate separator line position (divider between main and after data)
  // Also finds the last D.json data point
  const getSeparatorX = () => {
    if (!chartElement || !mainDataLength) return null;
    const svgElement = chartElement.querySelector('svg');
    if (!svgElement) return null;
    
    const chartRect = chartElement.getBoundingClientRect();
    const svgRect = svgElement.getBoundingClientRect();
    
    // First, try to find the separator line
    const lines = svgElement.querySelectorAll('line');
    let separatorLine = null;
    let lastDataPointX = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const x1 = parseFloat(line.getAttribute('x1') || 0);
      const x2 = parseFloat(line.getAttribute('x2') || 0);
      if (x1 === x2 && x1 > svgRect.width * 0.7) {
        separatorLine = line;
        break;
      }
    }
    
    if (separatorLine) {
      const x1 = parseFloat(separatorLine.getAttribute('x1') || 0);
      return chartRect.left + x1;
    }
    
    // If no separator line, find the last D.json data point (circles/rects)
    // Find all circles and rects that might be data points
    const dataElements = Array.from(svgElement.querySelectorAll('circle, rect, line'));
    let rightmostX = 0;
    
    for (const element of dataElements) {
      let x = 0;
      if (element.tagName === 'circle') {
        x = parseFloat(element.getAttribute('cx') || 0);
      } else if (element.tagName === 'rect') {
        x = parseFloat(element.getAttribute('x') || 0);
      } else if (element.tagName === 'line') {
        const x1 = parseFloat(element.getAttribute('x1') || 0);
        const x2 = parseFloat(element.getAttribute('x2') || 0);
        // For lines, use the rightmost point
        x = Math.max(x1, x2);
      }
      
      // Only consider points that are likely data points (not too far right, likely part of main chart)
      if (x > rightmostX && x < svgRect.width * 0.95) {
        rightmostX = x;
      }
    }
    
    if (rightmostX > 0) {
      return chartRect.left + rightmostX;
    }
    
    // Final fallback: Estimate based on data
    const totalWidth = svgRect.width;
    const leftPadding = 60;
    const rightPadding = 20;
    const availableWidth = totalWidth - leftPadding - rightPadding;
    const estimatedSeparatorX = leftPadding + availableWidth * 0.85;
    
    return chartRect.left + estimatedSeparatorX;
  };

  // Check if a touch position is in the selectable area (after the separator)
  const isInSelectableArea = (clientX) => {
    const separatorX = getSeparatorX();
    if (!separatorX) {
      // If we can't find separator, assume it's selectable (fallback to old behavior)
      return true;
    }
    // Selectable area is to the right of the separator
    return clientX > separatorX;
  };

  // Constrain a position within valid bounds
  // This constrains the CENTER POINT (target position) of the magnifier
  const constrainPosition = (x, y, selectionBounds) => {
    if (!selectionBounds) return { x: 0, y: 0 };
    
    const separatorX = getSeparatorX();
    let minX = 0;
    let maxX = selectionBounds.width;
    
    if (separatorX) {
      // Separator marks the boundary between historical data (left) and prediction area (right)
      // Predictions are made AFTER the separator, so allow positions in the full selection area
      // Minimum X should be at or after the separator (prediction area only, not historical data)
      const separatorXInSelection = separatorX - selectionBounds.left;
      minX = separatorXInSelection; // Can only go from separator onwards (prediction area)
      maxX = selectionBounds.width; // Can reach the right edge of the selection area
    }
    
    const minY = 0;
    const maxY = selectionBounds.height;
    
    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y)),
    };
  };

  // Convert client coordinates to selection-area-relative coordinates
  const clientToSelectionCoords = (clientX, clientY, selectionBounds) => {
    if (!selectionBounds) return { x: 0, y: 0 };
    return {
      x: clientX - selectionBounds.left,
      y: clientY - selectionBounds.top,
    };
  };

  // Convert selection-area-relative coordinates to client coordinates
  const selectionToClientCoords = (x, y, selectionBounds) => {
    if (!selectionBounds) return { x: 0, y: 0 };
    return {
      x: selectionBounds.left + x,
      y: selectionBounds.top + y,
    };
  };

  // Calculate where the magnifier should be rendered (can move freely)
  // The center of the magnifier must be within selection area, but widget can extend beyond
  const getMagnifierRenderPosition = (targetPos, selectionBounds) => {
    if (!selectionBounds) return { x: 0, y: 0 };
    
    // targetPos is the center point, constrained to be within selection area
    // Calculate render position (top-left corner) from center: center - size/2
    // The widget can extend beyond selection area as long as center is within bounds
    let renderX = targetPos.x - magnifierSize / 2;
    let renderY = targetPos.y - magnifierSize / 2;
    
    // No constraints on render position - widget can overlap with volume area, etc.
    // as long as the center (targetPos) is within the selection area
    
    return { x: renderX, y: renderY };
  };

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 1024;
      const mobile = isSmallScreen && hasTouch;
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Initialize position to prediction area (right side) when component mounts
  useEffect(() => {
    if (!chartElement || !isMobile) return;
    const selectionBounds = getSelectionAreaBounds();
    if (selectionBounds) {
      // Position in the prediction area (right side, where selections are made)
      // The separator line marks the boundary between historical data (left) and prediction area (right)
      const separatorX = getSeparatorX();
      let initialX = selectionBounds.width * 0.9; // Default to 90% from left (far right side)
      
      if (separatorX) {
        // Position in the prediction area - after the separator
        // The separator marks the end of historical data, so predictions are made to the right
        const separatorXInSelection = separatorX - selectionBounds.left;
        const predictionAreaWidth = selectionBounds.width - separatorXInSelection;
        // Position in the middle-right of the prediction area (after separator)
        initialX = separatorXInSelection + (predictionAreaWidth * 0.7); // 70% into the prediction area
      }
      
      const initialPos = constrainPosition(
        initialX,
        selectionBounds.height / 2,
        selectionBounds
      );
      setTargetPosition(initialPos);
      targetPositionRef.current = initialPos; // Also update ref immediately
      const initialRenderPos = getMagnifierRenderPosition(initialPos, selectionBounds);
      setMagnifierRenderPos(initialRenderPos);
      hasPositionedRef.current = true;
      setHasBeenPositioned(true); // Always show content
      lastTapPositionRef.current = initialPos;
      lastTapTimeRef.current = 0;
    }
  }, [chartElement, isMobile]);

  // Clone chart element for magnification - DISABLED (no magnifying effect)
  // useEffect(() => {
  //   if (!chartElement || !magnifiedContentRef.current) return;

  //   const chartRect = chartElement.getBoundingClientRect();
  //   const svgElement = chartElement.querySelector('svg');
    
  //   if (!svgElement) return;

  //   const clone = svgElement.cloneNode(true);
  //   clone.style.width = `${chartRect.width}px`;
  //   clone.style.height = `${chartRect.height}px`;
  //   clone.style.position = 'absolute';
    
  //   if (chartCloneRef.current) {
  //     magnifiedContentRef.current.removeChild(chartCloneRef.current);
  //   }
    
  //   magnifiedContentRef.current.appendChild(clone);
  //   chartCloneRef.current = clone;

  //   return () => {
  //     if (chartCloneRef.current && magnifiedContentRef.current) {
  //       magnifiedContentRef.current.removeChild(chartCloneRef.current);
  //       chartCloneRef.current = null;
  //     }
  //   };
  // }, [chartElement]);

  // Handle touch events on magnifier itself - drag to move, tap to select
  useEffect(() => {
    if (!enabled || !magnifierRef.current || !isMobile) return;

    const MOVEMENT_THRESHOLD = 10; // Pixels of movement to consider it a drag
    const MAX_TAP_DURATION = 300; // Max milliseconds for a tap

    let touchStartTime = 0;
    let touchStartPos = null;
    let magnifierStartPos = null; // Magnifier position when drag started
    let touchMoved = false;
    let activeTouchId = null;
    let isDraggingMagnifier = false;
    let selectionBoundsCache = null; // Cache selection bounds during drag for performance
    let rafId = null; // RequestAnimationFrame ID for smooth updates
    let hasDragged = false; // Track if user has dragged the magnifier (moved beyond threshold)
    
    // Helper function to make a selection at the current magnifier position
    // This function is bulletproof and will always try to make a selection if possible
    const makeSelection = () => {
      // Don't make selection if magnifier is disabled
      if (!enabled) {
        console.log('[ChartMagnifier] Selection blocked - magnifier is disabled');
        return false;
      }
      
      try {
        // Always get fresh bounds to ensure accuracy
        let selectionBounds = getSelectionAreaBounds();
        
        // If bounds are not available, try to get them from cache or recalculate
        if (!selectionBounds) {
          selectionBounds = selectionBoundsCache || getSelectionAreaBounds();
        }
        
        // Final fallback: if still no bounds, try to get from chart element directly
        if (!selectionBounds && chartElement) {
          const rect = chartElement.getBoundingClientRect();
          const volumePercentage = 0.25;
          const selectionAreaHeight = rect.height * (1 - volumePercentage);
          selectionBounds = {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.top + selectionAreaHeight,
            width: rect.width,
            height: selectionAreaHeight,
          };
        }
        
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
          selectionPos = lastTapPositionRef.current;
        }
        if (!selectionPos || typeof selectionPos.x !== 'number' || typeof selectionPos.y !== 'number') {
          // Final fallback: use center of selection area
          selectionPos = {
            x: selectionBounds.width * 0.85, // Right side of chart (prediction area)
            y: selectionBounds.height * 0.5, // Middle vertically
          };
        }
        
        // Ensure position is within bounds
        const constrainedPos = constrainPosition(selectionPos.x, selectionPos.y, selectionBounds);
        const clientCoords = selectionToClientCoords(constrainedPos.x, constrainedPos.y, selectionBounds);
        
        // Validate coordinates are valid numbers
        if (typeof clientCoords.x !== 'number' || typeof clientCoords.y !== 'number' || 
            isNaN(clientCoords.x) || isNaN(clientCoords.y)) {
          console.error('[ChartMagnifier] Invalid coordinates calculated:', clientCoords);
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
        
        // Call the selection callback with error handling and validation
        try {
          if (typeof onSelectionRef.current === 'function') {
            console.log('[ChartMagnifier] Calling onSelection callback:', syntheticEvent);
            onSelectionRef.current(syntheticEvent);
            console.log('[ChartMagnifier] Selection callback called successfully');
          } else {
            console.error('[ChartMagnifier] onSelection is not a function:', typeof onSelectionRef.current);
            // Try one more time after a brief delay in case callback was just set
            setTimeout(() => {
              if (typeof onSelectionRef.current === 'function') {
                console.log('[ChartMagnifier] Retrying selection callback after delay');
                try {
                  onSelectionRef.current(syntheticEvent);
                } catch (retryError) {
                  console.error('[ChartMagnifier] Retry also failed:', retryError);
                }
              }
            }, 50);
            return false;
          }
        } catch (error) {
          console.error('[ChartMagnifier] Error calling selection callback:', error);
          // Try one more time after a brief delay
          setTimeout(() => {
            if (typeof onSelectionRef.current === 'function') {
              console.log('[ChartMagnifier] Retrying selection callback after error');
              try {
                onSelectionRef.current(syntheticEvent);
              } catch (retryError) {
                console.error('[ChartMagnifier] Retry after error also failed:', retryError);
              }
            }
          }, 50);
          // Still return true if we attempted the call (error might be in callback, not our code)
          return true;
        }
        
        // Reset after successful selection
        lastTapPositionRef.current = null;
        lastTapTimeRef.current = 0;
        return true;
      } catch (error) {
        console.error('[ChartMagnifier] Unexpected error in makeSelection:', error);
        return false;
      }
    };
    
    // Store makeSelection in ref so it can be accessed from other useEffects
    makeSelectionRef.current = makeSelection;

    const handleMagnifierTouchStart = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      
      const touch = e.touches[0];
      
      // If we already have an active touch with this identifier, ignore this new touchstart
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
      hasDragged = false; // Reset drag flag on new touch start
      
      // Cache selection bounds for performance during drag
      selectionBoundsCache = getSelectionAreaBounds();
      
      // Store initial magnifier position when touch starts (will be used if user drags)
      if (magnifierRef.current && selectionBoundsCache) {
        const rect = magnifierRef.current.getBoundingClientRect();
        magnifierStartPos = {
          x: rect.left - selectionBoundsCache.left,
          y: rect.top - selectionBoundsCache.top,
        };
      }
      
      // Don't set isDragging yet - only set it when user actually moves
    };

    const handleMagnifierTouchMove = (e) => {
      // Only handle touches that started on the magnifier itself
      if (activeTouchId === null) {
        return;
      }
      
      if (!e.touches || e.touches.length === 0) {
        return;
      }
      
      safePreventDefault(e);
      e.stopPropagation();
      
      let touch = null;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === activeTouchId) {
          touch = e.touches[i];
          break;
        }
      }
      
      if (!touch || !touchStartPos || !selectionBoundsCache) {
        return;
      }
      
      const dx = touch.clientX - touchStartPos.x;
      const dy = touch.clientY - touchStartPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Only update position if user has moved beyond threshold (actual drag)
      if (magnifierStartPos !== null && distance > MOVEMENT_THRESHOLD) {
        touchMoved = true;
        hasDragged = true; // Mark that user has dragged the magnifier
        isDraggingMagnifier = true;
        setIsDraggingMagnifierWidget(true);
        isDraggingMagnifierWidgetRef.current = true; // Update ref immediately for synchronous access
        setIsDragging(true); // Set dragging state when actually dragging
        
        // Cancel any pending animation frame
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }
        
        // Use requestAnimationFrame for smooth updates
        rafId = requestAnimationFrame(() => {
          // Calculate new magnifier render position (top-left corner) in selection-area-relative coords
          const newMagnifierX = magnifierStartPos.x + dx;
          const newMagnifierY = magnifierStartPos.y + dy;
          
          // Calculate the center position from the new render position (in selection-area-relative coords)
          const newCenterX = newMagnifierX + magnifierSize / 2;
          const newCenterY = newMagnifierY + magnifierSize / 2;
          
          // Constrain the CENTER to stay within selection area (widget can extend beyond)
          const constrainedTarget = constrainPosition(newCenterX, newCenterY, selectionBoundsCache);
          
          // Calculate render position from constrained center (in selection-area-relative coords)
          const constrainedRenderX = constrainedTarget.x - magnifierSize / 2;
          const constrainedRenderY = constrainedTarget.y - magnifierSize / 2;
          
          // Update render position (can extend beyond selection area, in selection-area-relative coords)
          setMagnifierRenderPos({ x: constrainedRenderX, y: constrainedRenderY });
          
          // Update target position (center, constrained to selection area)
          setTargetPosition(constrainedTarget);
          targetPositionRef.current = constrainedTarget; // Keep ref in sync
          lastTapPositionRef.current = constrainedTarget;
          
          rafId = null;
        });
      }
    };

    const handleMagnifierTouchEnd = (e) => {
      if (!e.changedTouches || e.changedTouches.length === 0) return;
      
      safePreventDefault(e);
      e.stopPropagation();
      
      // Cancel any pending animation frame
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      
      let touch = null;
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
        selectionBoundsCache = null;
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
      
      // Simple logic: If it was a tap (not a drag), make selection
      if (isTap) {
        console.log('[ChartMagnifier] Tap detected - making selection');
        // Use a small delay to ensure state is updated
        setTimeout(() => {
          const result = makeSelection();
          if (!result) {
            console.warn('[ChartMagnifier] Selection failed, retrying...');
            setTimeout(() => makeSelection(), 100);
          }
        }, 50);
      } else if (hasDragged) {
        // If it was a drag, don't make selection - user was just moving the magnifier
        console.log('[ChartMagnifier] Drag ended - no selection');
      }
      
      activeTouchId = null;
      touchMoved = false;
      touchStartPos = null;
      magnifierStartPos = null;
      isDraggingMagnifier = false;
      hasDragged = false; // Reset drag flag
      setIsDragging(false);
      setIsDraggingMagnifierWidget(false);
      isDraggingMagnifierWidgetRef.current = false;
      selectionBoundsCache = null;
    };

    const handleMagnifierTouchCancel = () => {
      // Cancel any pending animation frame
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      
      activeTouchId = null;
      touchMoved = false;
      touchStartPos = null;
      magnifierStartPos = null;
      isDraggingMagnifier = false;
      hasDragged = false; // Reset drag flag
      setIsDragging(false);
      setIsDraggingMagnifierWidget(false);
      isDraggingMagnifierWidgetRef.current = false;
      selectionBoundsCache = null;
    };

    const magnifierElement = magnifierRef.current;
    magnifierElement.addEventListener('touchstart', handleMagnifierTouchStart, { passive: false });
    magnifierElement.addEventListener('touchmove', handleMagnifierTouchMove, { passive: false });
    magnifierElement.addEventListener('touchend', handleMagnifierTouchEnd, { passive: false });
    magnifierElement.addEventListener('touchcancel', handleMagnifierTouchCancel, { passive: false });

    return () => {
      // Cancel any pending animation frames
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      
      magnifierElement.removeEventListener('touchstart', handleMagnifierTouchStart);
      magnifierElement.removeEventListener('touchmove', handleMagnifierTouchMove);
      magnifierElement.removeEventListener('touchend', handleMagnifierTouchEnd);
      magnifierElement.removeEventListener('touchcancel', handleMagnifierTouchCancel);
    };
  }, [enabled, isMobile, chartElement]);

  // Block chart touch events on mobile only in selectable area
  useEffect(() => {
    if (!enabled || !chartElement || !isMobile) return;

    const handleChartClick = (e) => {
      // Only prevent default if in selectable area
      const inSelectableArea = isInSelectableArea(e.clientX);
      if (inSelectableArea) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleChartTouch = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      
      const touch = e.touches[0];
      const inSelectableArea = isInSelectableArea(touch.clientX);
      
      // Only prevent default if in selectable area
      if (inSelectableArea) {
        safePreventDefault(e);
        e.stopPropagation();
      }
      // Otherwise allow default scrolling
    };

    chartElement.addEventListener('click', handleChartClick, { passive: false });
    chartElement.addEventListener('touchstart', handleChartTouch, { passive: false });

    return () => {
      chartElement.removeEventListener('click', handleChartClick);
      chartElement.removeEventListener('touchstart', handleChartTouch);
    };
  }, [enabled, chartElement, isMobile]);

  // Disabled: Chart touch handlers that move magnifier position
  // Magnifier should ONLY move when dragged directly, not when touching the chart
  // This ensures the magnifier only moves when you drag it, and only selects when you tap it

  // Update magnified content transform to align with target position - DISABLED (no magnifying effect)
  // useEffect(() => {
  //   if (!chartElement || !magnifiedContentRef.current || !chartCloneRef.current) return;
    
  //   const selectionBounds = getSelectionAreaBounds();
  //   if (!selectionBounds) return;
    
  //   const scale = zoomLevel;
    
  //   // Calculate offset to center the target position in the magnifier
  //   // The target position is where we want to look at in the chart
  //   // We need to transform the cloned chart so that target position appears at magnifier center
  //   const offsetX = (magnifierSize / 2) / scale - targetPosition.x;
  //   const offsetY = (magnifierSize / 2) / scale - targetPosition.y;
    
  //   if (chartCloneRef.current) {
  //     chartCloneRef.current.style.transform = `scale(${scale}) translate(${offsetX}px, ${offsetY}px)`;
  //     chartCloneRef.current.style.transformOrigin = 'top left';
  //   }
  // }, [targetPosition, chartElement, magnifierSize, zoomLevel]);

  // Track scroll to update magnifier position so it stays aligned with the chart
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef(null);
  
  // Sync position when targetPosition changes (user interaction)
  useEffect(() => {
    if (!enabled || !isMobile || !chartElement || !magnifierRef.current || isScrolling) return;
    
    const selectionBounds = getSelectionAreaBounds();
    if (!selectionBounds) return;
    
    const renderPos = isDraggingMagnifierWidgetRef.current 
      ? magnifierRenderPos 
      : getMagnifierRenderPosition(targetPosition, selectionBounds);
    
    magnifierRef.current.style.left = `${selectionBounds.left + renderPos.x}px`;
    magnifierRef.current.style.top = `${selectionBounds.top + renderPos.y}px`;
  }, [targetPosition, enabled, isMobile, chartElement, isScrolling, magnifierRenderPos]);
  
  // Update position directly via DOM for smoother scrolling
  useEffect(() => {
    if (!enabled || !isMobile || !chartElement || !magnifierRef.current) return;
    
    let rafId = null;
    
    const updatePosition = () => {
      // Mark that we're scrolling
      setIsScrolling(true);
      
      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Set timeout to mark scrolling as stopped
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
      
      // Use requestAnimationFrame for smooth updates
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          // Update position directly via DOM for maximum smoothness
          if (magnifierRef.current && chartElement) {
            const selectionBounds = getSelectionAreaBounds();
            if (selectionBounds) {
              const renderPos = isDraggingMagnifierWidgetRef.current 
                ? magnifierRenderPos 
                : getMagnifierRenderPosition(targetPosition, selectionBounds);
              
              // Update directly without triggering React re-render
              magnifierRef.current.style.left = `${selectionBounds.left + renderPos.x}px`;
              magnifierRef.current.style.top = `${selectionBounds.top + renderPos.y}px`;
            }
          }
          rafId = null;
        });
      }
    };
    
    // Listen to scroll events on window and any scrollable parents
    window.addEventListener('scroll', updatePosition, { passive: true });
    window.addEventListener('resize', updatePosition, { passive: true });
    
    // Track parent elements so we can clean them up
    const parentElements = [];
    let parent = chartElement.parentElement;
    while (parent && parent !== document.body) {
      parentElements.push(parent);
      parent.addEventListener('scroll', updatePosition, { passive: true });
      parent = parent.parentElement;
    }
    
    return () => {
      // Cancel any pending animation frame
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
      
      // Remove listeners from tracked parents
      parentElements.forEach(parentEl => {
        parentEl.removeEventListener('scroll', updatePosition);
      });
    };
  }, [enabled, isMobile, chartElement, targetPosition, magnifierRenderPos]);

  // Don't show on desktop
  if (!enabled || !isMobile) {
    return null;
  }

  const selectionBounds = getSelectionAreaBounds();
  if (!selectionBounds || !chartElement) return null;

  // Use the tracked render position (or calculate from target if not dragging widget)
  const renderPos = isDraggingMagnifierWidgetRef.current 
    ? magnifierRenderPos 
    : getMagnifierRenderPosition(targetPosition, selectionBounds);

  return (
    <>
      {chartElement && (
        <div
          ref={magnifierRef}
          className={`fixed z-30 pointer-events-auto`}
          style={{
            left: `${selectionBounds.left + renderPos.x}px`,
            top: `${selectionBounds.top + renderPos.y}px`,
            width: `${magnifierSize}px`,
            height: `${magnifierSize}px`,
            transform: isDragging ? 'scale(1.05)' : 'scale(1)',
            transition: (isDragging || isScrolling) 
              ? 'none' 
              : 'transform 0.15s ease-out', // Only transition when not dragging or scrolling
            cursor: 'move',
            willChange: 'transform, left, top',
            touchAction: 'none', // Prevent default touch behaviors for smooth dragging
          }}
        >
          <div
            className="absolute inset-0 rounded-md overflow-hidden pointer-events-none"
            style={{
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
            }}
          >
            {/* Removed magnified content - no magnifying effect */}
            
            <div className="absolute inset-0 pointer-events-none">
              <div 
                className="absolute top-1/2 left-0 right-0 h-px bg-turquoise-400"
                style={{ 
                  transform: 'translateY(-50%)',
                  opacity: isDragging ? 0.7 : 0.5,
                }}
              />
              <div 
                className="absolute left-1/2 top-0 bottom-0 w-px bg-turquoise-400"
                style={{ 
                  transform: 'translateX(-50%)',
                  opacity: isDragging ? 0.7 : 0.5,
                }}
              />
              <div 
                className="absolute top-1/2 left-1/2 bg-turquoise-400 rounded-md transition-all"
                style={{ 
                  transform: 'translate(-50%, -50%)',
                  width: isDragging ? '4px' : '2px',
                  height: isDragging ? '4px' : '2px',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChartMagnifier;