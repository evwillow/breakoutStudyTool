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
      // Separator marks the last D.json data point
      // Center point can go all the way to the separator (inclusive) - this is the right border
      const separatorXInSelection = separatorX - selectionBounds.left;
      // Center can reach exactly the separator position (right border) - allow up to separator
      minX = 0; // Can go to left edge
      maxX = separatorXInSelection; // Can reach exactly the separator position (right border)
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
  const getMagnifierRenderPosition = (targetPos, selectionBounds) => {
    if (!selectionBounds) return { x: 0, y: 0 };
    
    // Default: position at bottom center of selection area
    const padding = 8;
    const defaultY = selectionBounds.bottom - magnifierSize / 2 - padding;
    const defaultYRelative = defaultY - selectionBounds.top;
    
    // When dragging the magnifier itself, allow free movement
    // Otherwise, follow the target position horizontally
    let renderX = targetPos.x - magnifierSize / 2;
    let renderY = defaultYRelative;
    
    // Constrain render position to keep magnifier within selection bounds
    // Also respect separator - allow center to reach exactly the separator position
    const separatorX = getSeparatorX();
    let minRenderX = 0;
    let maxRenderX = selectionBounds.width - magnifierSize;
    
    if (separatorX) {
      // Separator marks the last D.json data point
      const separatorXInSelection = separatorX - selectionBounds.left;
      // Allow center to reach exactly the separator (right border)
      // If center is at separator, renderX = separatorXInSelection - magnifierSize/2
      minRenderX = 0; // Can go to left edge
      // Maximum allows center to reach separator: when center = separator, renderX = separator - size/2
      maxRenderX = Math.min(separatorXInSelection - magnifierSize / 2, selectionBounds.width - magnifierSize);
      // Ensure we don't go below 0
      if (maxRenderX < 0) maxRenderX = 0;
    }
    
    // Ensure magnifier doesn't go above the chart area (stays below header)
    // The selectionBounds already excludes volume and respects chart boundaries
    const minRenderY = 0;
    const maxRenderY = selectionBounds.height - magnifierSize;
    
    renderX = Math.max(minRenderX, Math.min(maxRenderX, renderX));
    renderY = Math.max(minRenderY, Math.min(maxRenderY, renderY));
    
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

  // Initialize position to center when component mounts
  useEffect(() => {
    if (!chartElement || !isMobile) return;
    const selectionBounds = getSelectionAreaBounds();
    if (selectionBounds) {
      const initialPos = constrainPosition(
        selectionBounds.width / 2,
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

  // Clone chart element for magnification
  useEffect(() => {
    if (!chartElement || !magnifiedContentRef.current) return;

    const chartRect = chartElement.getBoundingClientRect();
    const svgElement = chartElement.querySelector('svg');
    
    if (!svgElement) return;

    const clone = svgElement.cloneNode(true);
    clone.style.width = `${chartRect.width}px`;
    clone.style.height = `${chartRect.height}px`;
    clone.style.position = 'absolute';
    
    if (chartCloneRef.current) {
      magnifiedContentRef.current.removeChild(chartCloneRef.current);
    }
    
    magnifiedContentRef.current.appendChild(clone);
    chartCloneRef.current = clone;

    return () => {
      if (chartCloneRef.current && magnifiedContentRef.current) {
        magnifiedContentRef.current.removeChild(chartCloneRef.current);
        chartCloneRef.current = null;
      }
    };
  }, [chartElement]);

  // Handle touch events on magnifier itself - double tap to activate, drag when activated
  useEffect(() => {
    if (!enabled || !magnifierRef.current || !isMobile) return;

    const DOUBLE_TAP_TIME = 400;
    const MOVEMENT_THRESHOLD = 10;

    let touchStartTime = 0;
    let touchStartPos = null;
    let magnifierStartPos = null; // Magnifier position when drag started
    let touchMoved = false;
    let activeTouchId = null;
    let isDraggingMagnifier = false;

    const handleMagnifierTouchStart = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      
      const touch = e.touches[0];
      
      // If we already have an active touch with this identifier, ignore this new touchstart
      // This prevents resetting the drag position during an ongoing drag
      if (activeTouchId !== null && activeTouchId === touch.identifier) {
        console.log('[Magnifier] TouchStart - duplicate touch for same ID, ignoring');
        return;
      }
      
      safePreventDefault(e);
      e.stopPropagation();
      
      touchStartTime = Date.now();
      touchMoved = false;
      touchStartPos = { x: touch.clientX, y: touch.clientY };
      activeTouchId = touch.identifier;
      isDraggingMagnifier = false;
      
      console.log('[Magnifier] TouchStart:', {
        touchId: touch.identifier,
        clientPos: { x: touch.clientX, y: touch.clientY },
        targetPosition,
        magnifierRenderPos
      });
      
      // Store initial magnifier position when drag starts (only if not already dragging)
      if (magnifierRef.current && magnifierStartPos === null) {
        const selectionBounds = getSelectionAreaBounds();
        if (selectionBounds) {
          const rect = magnifierRef.current.getBoundingClientRect();
          magnifierStartPos = {
            x: rect.left - selectionBounds.left,
            y: rect.top - selectionBounds.top,
          };
          console.log('[Magnifier] Drag start - stored initial pos:', magnifierStartPos);
        } else {
          console.warn('[Magnifier] Drag start - no selectionBounds!');
        }
      }
      
      setIsDragging(true);
    };

    const handleMagnifierTouchMove = (e) => {
      // Only handle touches that started on the magnifier itself
      if (activeTouchId === null) {
        // This touch didn't start on magnifier - ignore it (chart will handle it)
        return;
      }
      
      console.log('[Magnifier] TouchMove called:', {
        hasTouches: !!(e.touches && e.touches.length > 0),
        touchCount: e.touches?.length || 0,
        activeTouchId,
        hasMagnifierStartPos: magnifierStartPos !== null
      });
      
      if (!e.touches || e.touches.length === 0) {
        console.warn('[Magnifier] TouchMove - no touches, returning');
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
      
      if (!touch) {
        console.warn('[Magnifier] TouchMove - touch not found for activeTouchId:', activeTouchId);
        return;
      }
      
      if (!touchStartPos) {
        console.warn('[Magnifier] TouchMove - no touchStartPos, returning');
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
        const selectionBounds = getSelectionAreaBounds();
        if (selectionBounds) {
          // Calculate new magnifier render position
          const newMagnifierX = magnifierStartPos.x + dx;
          const newMagnifierY = magnifierStartPos.y + dy;
          
          // Constrain magnifier render position to stay within bounds
          const minRenderX = 0;
          const maxRenderX = selectionBounds.width - magnifierSize;
          const minRenderY = 0;
          const maxRenderY = selectionBounds.height - magnifierSize;
          
          const constrainedMagnifierX = Math.max(minRenderX, Math.min(maxRenderX, newMagnifierX));
          const constrainedMagnifierY = Math.max(minRenderY, Math.min(maxRenderY, newMagnifierY));
          
          console.log('[Magnifier] TouchMove (dragging):', {
            dx, dy, distance,
            newPos: { x: newMagnifierX, y: newMagnifierY },
            constrainedPos: { x: constrainedMagnifierX, y: constrainedMagnifierY },
            bounds: { width: selectionBounds.width, height: selectionBounds.height }
          });
          
          // Update render position directly when dragging the magnifier
          setMagnifierRenderPos({ x: constrainedMagnifierX, y: constrainedMagnifierY });
          isDraggingMagnifierWidgetRef.current = true;
          
          // Update target position: center of magnifier becomes new target
          const newTargetX = constrainedMagnifierX + magnifierSize / 2;
          const newTargetY = constrainedMagnifierY + magnifierSize / 2;
          
          const constrainedTarget = constrainPosition(newTargetX, newTargetY, selectionBounds);
          setTargetPosition(constrainedTarget);
          lastTapPositionRef.current = constrainedTarget;
        } else {
          console.warn('[Magnifier] TouchMove (dragging) - no selectionBounds!');
        }
      } else {
        console.log('[Magnifier] TouchMove (not dragging):', {
          hasMagnifierStartPos: magnifierStartPos !== null,
          distance,
          touchMoved
        });
      }
    };

    const handleMagnifierTouchEnd = (e) => {
      if (!e.changedTouches || e.changedTouches.length === 0) return;
      
      safePreventDefault(e);
      e.stopPropagation();
      
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
        return;
      }
      
      const touchDuration = Date.now() - touchStartTime;
      const isQuickTap = touchDuration < 300 && !touchMoved;
      const timeSinceLastTap = Date.now() - magnifierLastTapTimeRef.current;
      
      if (isQuickTap && !isDraggingMagnifier) {
        if (timeSinceLastTap < DOUBLE_TAP_TIME && magnifierLastTapTimeRef.current > 0) {
          // Double tap detected - make selection at the center of the magnifying glass
          console.log('[Magnifier] Double tap detected - making selection at center');
          const selectionBounds = getSelectionAreaBounds();
          if (selectionBounds && onSelectionRef.current) {
            // Always use targetPositionRef.current (center point of magnifying glass) for selection
            // This ensures we get the latest value even if handler closure is stale
            const selectionPos = targetPositionRef.current;
            const clientCoords = selectionToClientCoords(selectionPos.x, selectionPos.y, selectionBounds);
            
            console.log('[Magnifier] Making selection at center:', clientCoords, 'from targetPosition:', selectionPos);
            
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
    };

    const handleMagnifierTouchCancel = () => {
      activeTouchId = null;
      touchMoved = false;
      touchStartPos = null;
      magnifierStartPos = null;
      isDraggingMagnifier = false;
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
  }, [enabled, isMobile, chartElement, targetPosition]);

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

  // Update magnified content transform to align with target position
  useEffect(() => {
    if (!chartElement || !magnifiedContentRef.current || !chartCloneRef.current) return;
    
    const selectionBounds = getSelectionAreaBounds();
    if (!selectionBounds) return;
    
    const scale = zoomLevel;
    
    // Calculate offset to center the target position in the magnifier
    // The target position is where we want to look at in the chart
    // We need to transform the cloned chart so that target position appears at magnifier center
    const offsetX = (magnifierSize / 2) / scale - targetPosition.x;
    const offsetY = (magnifierSize / 2) / scale - targetPosition.y;
    
    if (chartCloneRef.current) {
      chartCloneRef.current.style.transform = `scale(${scale}) translate(${offsetX}px, ${offsetY}px)`;
      chartCloneRef.current.style.transformOrigin = 'top left';
    }
  }, [targetPosition, chartElement, magnifierSize, zoomLevel]);

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
          className={`absolute z-30 transition-all duration-200 ease-out pointer-events-auto`}
          style={{
            left: `${renderPos.x}px`,
            top: `${renderPos.y}px`,
            width: `${magnifierSize}px`,
            height: `${magnifierSize}px`,
            transform: isDragging ? 'scale(1.05)' : 'scale(1)',
            cursor: 'move',
            willChange: 'transform, left, top',
          }}
        >
          <div
            className="absolute inset-0 rounded-full overflow-hidden"
            style={{
              background: 'rgba(0, 0, 0, 0.85)',
              // Always use inactive look - never show active styling
              border: '1.5px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.05)',
              transition: 'all 0.2s ease-out',
            }}
          >
            <div
              ref={magnifiedContentRef}
              className="absolute inset-0"
              style={{
                clipPath: 'circle(50% at 50% 50%)',
                overflow: 'hidden',
                opacity: hasBeenPositioned ? 1 : 0,
                transition: 'opacity 0.2s ease-in-out',
              }}
            />
            
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