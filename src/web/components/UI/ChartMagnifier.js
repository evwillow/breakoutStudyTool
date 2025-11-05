"use client";

/**
 * ChartMagnifier Component
 * 
 * Provides an automatic magnifying glass tool for easier precise selection on charts
 * Mobile-only tool that auto-activates on touch and shows a zoomed view
 */

import React, { useState, useEffect, useRef } from 'react';

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
  const magnifierDoubleTapTimeRef = useRef(0);
  const magnifierLastTapTimeRef = useRef(0);
  const onSelectionRef = useRef(onSelection);
  const isDraggingMagnifierWidgetRef = useRef(false);
  const targetPositionRef = useRef({ x: 0, y: 0 });
  
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
      magnifierLastTapTimeRef.current = 0;
      magnifierDoubleTapTimeRef.current = 0;
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

  // Handle touch events on magnifier itself - double tap to activate, drag when activated
  useEffect(() => {
    if (!enabled || !magnifierRef.current || !isMobile) return;

    const DOUBLE_TAP_TIME = 400;
    const MOVEMENT_THRESHOLD = 5; // Lower threshold for more responsive dragging

    let touchStartTime = 0;
    let touchStartPos = null;
    let magnifierStartPos = null; // Magnifier position when drag started
    let touchMoved = false;
    let activeTouchId = null;
    let isDraggingMagnifier = false;
    let selectionBoundsCache = null; // Cache selection bounds during drag for performance
    let rafId = null; // RequestAnimationFrame ID for smooth updates

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
      
      // Cache selection bounds for performance during drag
      selectionBoundsCache = getSelectionAreaBounds();
      
      // Store initial magnifier position when drag starts
      if (magnifierRef.current && magnifierStartPos === null && selectionBoundsCache) {
        const rect = magnifierRef.current.getBoundingClientRect();
        magnifierStartPos = {
          x: rect.left - selectionBoundsCache.left,
          y: rect.top - selectionBoundsCache.top,
        };
      }
      
      setIsDragging(true);
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
      
      if (distance > MOVEMENT_THRESHOLD) {
        touchMoved = true;
      }
      
      // Always allow dragging the magnifier widget freely
      if (magnifierStartPos !== null) {
        isDraggingMagnifier = true;
        setIsDraggingMagnifierWidget(true);
        
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
          isDraggingMagnifierWidgetRef.current = true;
          
          // Update target position (center, constrained to selection area)
          setTargetPosition(constrainedTarget);
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
      const isQuickTap = touchDuration < 300 && !touchMoved;
      const timeSinceLastTap = Date.now() - magnifierLastTapTimeRef.current;
      
      if (isQuickTap && !isDraggingMagnifier) {
        if (timeSinceLastTap < DOUBLE_TAP_TIME && magnifierLastTapTimeRef.current > 0) {
          // Double tap detected - make selection at the center of the magnifying glass
          const selectionBounds = selectionBoundsCache || getSelectionAreaBounds();
          if (selectionBounds && onSelectionRef.current) {
            // Always use targetPositionRef.current (center point of magnifying glass) for selection
            const selectionPos = targetPositionRef.current;
            const clientCoords = selectionToClientCoords(selectionPos.x, selectionPos.y, selectionBounds);
            
            const syntheticEvent = {
              clientX: clientCoords.x,
              clientY: clientCoords.y,
              preventDefault: () => {},
              stopPropagation: () => {},
            };
            onSelectionRef.current(syntheticEvent);
            
            // Reset after selection
            lastTapPositionRef.current = null;
            lastTapTimeRef.current = 0;
          }
          magnifierDoubleTapTimeRef.current = Date.now();
          magnifierLastTapTimeRef.current = 0;
        } else {
          magnifierLastTapTimeRef.current = Date.now();
        }
      }
      
      activeTouchId = null;
      touchMoved = false;
      touchStartPos = null;
      magnifierStartPos = null;
      isDraggingMagnifier = false;
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

  // Block all chart touch events on mobile
  useEffect(() => {
    if (!enabled || !chartElement || !isMobile) return;

    const handleChartClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleChartTouch = (e) => {
      // Always allow chart touches when magnifier is active
      safePreventDefault(e);
      e.stopPropagation();
    };

    chartElement.addEventListener('click', handleChartClick, { passive: false });
    chartElement.addEventListener('touchstart', handleChartTouch, { passive: false });

    return () => {
      chartElement.removeEventListener('click', handleChartClick);
      chartElement.removeEventListener('touchstart', handleChartTouch);
    };
  }, [enabled, chartElement, isMobile]);

  // Handle touch events on chart - move target position
  useEffect(() => {
    if (!enabled || !chartElement || !isMobile) return;

    let touchMoved = false;
    let initialTouch = null;
    let totalMovement = 0;
    const MOVEMENT_THRESHOLD = 15;

    const handleChartTouchStart = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      
      safePreventDefault(e);
      e.stopPropagation();
      
      const touch = e.touches[0];
      const selectionBounds = getSelectionAreaBounds();
      if (!selectionBounds) {
        console.warn('[Chart] TouchStart - no selectionBounds');
        return;
      }
      
      if (activeTouchIdRef.current !== null) {
        console.log('[Chart] TouchStart - already active touch, ignoring');
        return;
      }
      
      console.log('[Chart] TouchStart:', {
        clientPos: { x: touch.clientX, y: touch.clientY },
        isDraggingWidget: isDraggingMagnifierWidgetRef.current
      });
      
      touchStartTimeRef.current = Date.now();
      touchMoved = false;
      totalMovement = 0;
      initialTouch = touch;
      activeTouchIdRef.current = touch.identifier;
      
      const coords = clientToSelectionCoords(touch.clientX, touch.clientY, selectionBounds);
      const constrained = constrainPosition(coords.x, coords.y, selectionBounds);
      
      console.log('[Chart] TouchStart - updating position:', {
        coords,
        constrained,
        currentTarget: targetPosition
      });
      
      setTargetPosition(constrained);
      // Update render position to follow target (unless we're dragging magnifier widget)
      if (!isDraggingMagnifierWidgetRef.current) {
        const newRenderPos = getMagnifierRenderPosition(constrained, selectionBounds);
        setMagnifierRenderPos(newRenderPos);
        console.log('[Chart] TouchStart - updated render pos:', newRenderPos);
      } else {
        console.log('[Chart] TouchStart - skipping render pos update (dragging widget)');
      }
      lastTapPositionRef.current = constrained;
    };

    const handleChartTouchMove = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      
      safePreventDefault(e);
      e.stopPropagation();
      
      let touch = null;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === activeTouchIdRef.current) {
          touch = e.touches[i];
          break;
        }
      }
      if (!touch) return;
      
      const selectionBounds = getSelectionAreaBounds();
      if (!selectionBounds) return;
      
      if (initialTouch) {
        const dx = touch.clientX - initialTouch.clientX;
        const dy = touch.clientY - initialTouch.clientY;
        totalMovement = Math.sqrt(dx * dx + dy * dy);
        touchMoved = totalMovement > MOVEMENT_THRESHOLD;
      }
      
      const coords = clientToSelectionCoords(touch.clientX, touch.clientY, selectionBounds);
      const constrained = constrainPosition(coords.x, coords.y, selectionBounds);
      
      console.log('[Chart] TouchMove:', {
        clientPos: { x: touch.clientX, y: touch.clientY },
        coords,
        constrained,
        isDraggingWidget: isDraggingMagnifierWidgetRef.current,
        totalMovement
      });
      
      setTargetPosition(constrained);
      // Update render position to follow target (unless we're dragging magnifier widget)
      if (!isDraggingMagnifierWidgetRef.current) {
        const newRenderPos = getMagnifierRenderPosition(constrained, selectionBounds);
        setMagnifierRenderPos(newRenderPos);
      }
      lastTapPositionRef.current = constrained;
      setIsDragging(true);
    };

    const handleChartTouchEnd = (e) => {
      if (!e.changedTouches || e.changedTouches.length === 0) return;
      
      safePreventDefault(e);
      e.stopPropagation();
      
      let touch = null;
      if (activeTouchIdRef.current !== null) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === activeTouchIdRef.current) {
            touch = e.changedTouches[i];
            break;
          }
        }
      }
      
      if (!touch) {
        setIsDragging(false);
        touchMoved = false;
        totalMovement = 0;
        initialTouch = null;
        activeTouchIdRef.current = null;
        return;
      }
      
      const selectionBounds = getSelectionAreaBounds();
      if (!selectionBounds) {
        setIsDragging(false);
        touchMoved = false;
        totalMovement = 0;
        initialTouch = null;
        activeTouchIdRef.current = null;
        return;
      }
      
      const coords = clientToSelectionCoords(touch.clientX, touch.clientY, selectionBounds);
      const constrained = constrainPosition(coords.x, coords.y, selectionBounds);
      
      setTargetPosition(constrained);
      // Update render position to follow target (unless we're dragging magnifier widget)
      if (!isDraggingMagnifierWidgetRef.current) {
        const newRenderPos = getMagnifierRenderPosition(constrained, selectionBounds);
        setMagnifierRenderPos(newRenderPos);
      }
      lastTapPositionRef.current = constrained;
      lastTapTimeRef.current = Date.now();
      hasPositionedRef.current = true;
      setHasBeenPositioned(true);
      
      setIsDragging(false);
      touchMoved = false;
      totalMovement = 0;
      initialTouch = null;
      activeTouchIdRef.current = null;
    };

    const handleGlobalTouchMove = (e) => {
      if (!e.touches || e.touches.length === 0 || activeTouchIdRef.current === null) return;
      
      let touch = null;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === activeTouchIdRef.current) {
          touch = e.touches[i];
          break;
        }
      }
      if (!touch) return;
      
      const selectionBounds = getSelectionAreaBounds();
      if (!selectionBounds) return;
      
      const coords = clientToSelectionCoords(touch.clientX, touch.clientY, selectionBounds);
      const constrained = constrainPosition(coords.x, coords.y, selectionBounds);
      
      setTargetPosition(constrained);
      // Update render position to follow target (unless we're dragging magnifier widget)
      if (!isDraggingMagnifierWidgetRef.current) {
        const newRenderPos = getMagnifierRenderPosition(constrained, selectionBounds);
        setMagnifierRenderPos(newRenderPos);
      }
      lastTapPositionRef.current = constrained;
      setIsDragging(true);
    };

    const handleChartTouchCancel = (e) => {
      setIsDragging(false);
      touchMoved = false;
      totalMovement = 0;
      initialTouch = null;
      activeTouchIdRef.current = null;
    };

    chartElement.addEventListener('touchstart', handleChartTouchStart, { passive: false });
    chartElement.addEventListener('touchmove', handleChartTouchMove, { passive: false });
    chartElement.addEventListener('touchend', handleChartTouchEnd, { passive: false });
    chartElement.addEventListener('touchcancel', handleChartTouchCancel, { passive: false });
    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });

    return () => {
      chartElement.removeEventListener('touchstart', handleChartTouchStart);
      chartElement.removeEventListener('touchmove', handleChartTouchMove);
      chartElement.removeEventListener('touchend', handleChartTouchEnd);
      chartElement.removeEventListener('touchcancel', handleChartTouchCancel);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
    };
  }, [enabled, chartElement, isMobile]);

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
            transition: isDragging ? 'none' : 'transform 0.15s ease-out', // Disable transition during drag for smoothness
            cursor: 'move',
            willChange: 'transform, left, top',
            touchAction: 'none', // Prevent default touch behaviors for smooth dragging
          }}
        >
          <div
            className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
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
                className="absolute top-1/2 left-1/2 bg-turquoise-400 rounded-full transition-all"
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