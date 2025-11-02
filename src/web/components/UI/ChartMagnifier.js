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
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hasBeenPositioned, setHasBeenPositioned] = useState(false); // Track if user has interacted
  const magnifierRef = useRef(null);
  const magnifiedContentRef = useRef(null);
  const chartCloneRef = useRef(null);
  const touchStartTimeRef = useRef(0);
  const activeTouchIdRef = useRef(null);
  const lastTapPositionRef = useRef(null);
  const lastTapTimeRef = useRef(0);
  const hasPositionedRef = useRef(false); // Track if user has positioned the magnifier
  const onSelectionRef = useRef(onSelection);
  
  // Keep onSelection ref updated
  useEffect(() => {
    onSelectionRef.current = onSelection;
  }, [onSelection]);

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
  // This marks the end of D.json data - magnifier should not go right of this
  const getSeparatorX = () => {
    if (!chartElement || !mainDataLength) return null;
    const svgElement = chartElement.querySelector('svg');
    if (!svgElement) return null;
    
    const svgRect = svgElement.getBoundingClientRect();
    const chartRect = chartElement.getBoundingClientRect();
    
    // Find the vertical line that represents the separator
    // It's typically drawn as a line element
    const lines = svgElement.querySelectorAll('line');
    let separatorLine = null;
    
    // Look for the separator line (usually has a specific class or is after all data points)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const x1 = parseFloat(line.getAttribute('x1') || 0);
      const x2 = parseFloat(line.getAttribute('x2') || 0);
      // The separator line is vertical (x1 === x2) and typically near the right side
      if (x1 === x2 && x1 > svgRect.width * 0.7) {
        separatorLine = line;
        break;
      }
    }
    
    if (separatorLine) {
      const x1 = parseFloat(separatorLine.getAttribute('x1') || 0);
      return chartRect.left + x1;
    }
    
    // Fallback: Estimate based on data point positions
    // Find the rightmost circle/rect that's part of the main data
    const shapes = Array.from(svgElement.querySelectorAll('circle, rect'));
    if (shapes.length > 0) {
      // Sort by x position and find the one that should be the last main data point
      const sortedShapes = shapes
        .map(s => {
          const x = parseFloat(s.getAttribute('x') || s.getAttribute('cx') || 0);
          return { element: s, x };
        })
        .sort((a, b) => b.x - a.x);
      
      // Estimate separator at the right edge of the data area
      // Using a simpler approach: calculate based on available width and data length
      const totalWidth = svgRect.width;
      const leftPadding = 60; // Approximate
      const rightPadding = 20;
      const availableWidth = totalWidth - leftPadding - rightPadding;
      
      // If we have mainDataLength, estimate where the separator should be
      // Assume roughly equal spacing between points
      const estimatedSeparatorX = leftPadding + availableWidth * 0.85; // Conservative estimate
      
      return chartRect.left + estimatedSeparatorX;
    }
    
    return null;
  };

  // Check if device is mobile - strict detection to ensure desktop never shows magnifier
  useEffect(() => {
    const checkMobile = () => {
      // Strict mobile detection to ensure magnifier ONLY appears on mobile:
      // 1. Screen width must be less than 1024px (tablets and desktops are excluded)
      // 2. Must have touch capability
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 1024;
      
      // Only show on mobile: small screen (< 1024px) WITH touch capability
      // This excludes:
      // - Desktop browsers (even if they have touch, they're >= 1024px)
      // - Large tablets (>= 1024px)
      // - Desktop with touchscreen (>= 1024px)
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
      const initialPos = { x: selectionBounds.width / 2, y: selectionBounds.height / 2 };
      setPosition(initialPos);
      // Reset tap tracking when component remounts or chart changes
      hasPositionedRef.current = false;
      setHasBeenPositioned(false); // Hide magnified content initially
      lastTapPositionRef.current = null;
      lastTapTimeRef.current = 0;
    }
  }, [chartElement, isMobile]);

  // Clone chart element for magnification
  useEffect(() => {
    if (!chartElement || !magnifiedContentRef.current) return;

    const chartRect = chartElement.getBoundingClientRect();
    const svgElement = chartElement.querySelector('svg');
    
    if (!svgElement) return;

    // Clone the SVG element
    const clone = svgElement.cloneNode(true);
    clone.style.width = `${chartRect.width}px`;
    clone.style.height = `${chartRect.height}px`;
    clone.style.position = 'absolute';
    
    // Clear previous clone
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

  // Handle touch events - prevent direct chart clicks, only allow magnifier interaction
  useEffect(() => {
    if (!enabled || !chartElement || !isMobile) return;

    let touchMoved = false;
    let initialTouch = null;
    let totalMovement = 0;
    const MOVEMENT_THRESHOLD = 15; // pixels - movement threshold to distinguish drag from tap
    const DOUBLE_TAP_TIME = 500; // ms - time window for double tap detection
    const POSITION_CHANGE_THRESHOLD = 20; // pixels - if magnifier moved less than this, consider it a second tap for selection

    const handleChartTouchStart = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      
      // Prevent default chart click handling on mobile - magnifier is the only way to select
      e.preventDefault();
      e.stopPropagation();
      
      const touch = e.touches[0];
      const selectionBounds = getSelectionAreaBounds();
      if (!selectionBounds) return;
      
      // If magnifier is being dragged, don't start a new touch
      if (activeTouchIdRef.current !== null) return;
      
      touchStartTimeRef.current = Date.now();
      touchMoved = false;
      totalMovement = 0;
      initialTouch = touch;
      activeTouchIdRef.current = touch.identifier;
      
      const x = initialTouch.clientX - selectionBounds.left;
      const y = initialTouch.clientY - selectionBounds.top;
      
      // Only update if touch is within selection area bounds
      if (x >= 0 && x <= selectionBounds.width && y >= 0 && y <= selectionBounds.height) {
        // Get separator position - this marks the end of D.json data
        const separatorX = getSeparatorX();
        const separatorXInSelection = separatorX ? separatorX - selectionBounds.left : selectionBounds.width;
        
        // Constrain X: can't go left of separator start, can't go right of separator (end of D.json)
        const minX = separatorX ? Math.max(0, separatorX - selectionBounds.left) : 0;
        const maxX = Math.min(separatorXInSelection, selectionBounds.width);
        
        // Only update X position (magnifier stays at fixed Y position)
        const clampedX = Math.max(minX, Math.min(maxX, x));
        
        // Calculate distance from last tap position to determine if this is a second tap
        const timeSinceLastTap = Date.now() - lastTapTimeRef.current;
        const distanceFromLastTap = lastTapPositionRef.current 
          ? Math.abs(clampedX - lastTapPositionRef.current.x)
          : Infinity;
        
        // Check if this might be a second tap (selection) vs first tap (positioning)
        const isPotentialSecondTap = hasPositionedRef.current && 
          timeSinceLastTap < DOUBLE_TAP_TIME && 
          distanceFromLastTap < POSITION_CHANGE_THRESHOLD;
        
        if (!isPotentialSecondTap) {
          // First tap or significant movement - update position
          setPosition(prev => {
            const newPos = { x: clampedX, y: prev.y };
            lastTapPositionRef.current = newPos;
            lastTapTimeRef.current = Date.now();
            hasPositionedRef.current = true;
            setHasBeenPositioned(true); // Show magnified content after first interaction
            return newPos;
          });
        }
        // If it's a potential second tap, we'll handle it in touchend
      }
    };

    const handleChartTouchMove = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      
      // Prevent default to stop chart scrolling/selection
      e.preventDefault();
      e.stopPropagation();
      
      // Find the active touch
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
      
      const x = touch.clientX - selectionBounds.left;
      
      // Track total movement (only horizontal for selection purposes)
      if (initialTouch) {
        const dx = touch.clientX - initialTouch.clientX;
        const dy = touch.clientY - initialTouch.clientY;
        totalMovement = Math.sqrt(dx * dx + dy * dy);
        touchMoved = totalMovement > MOVEMENT_THRESHOLD;
      }
      
      // Get separator position - this marks the end of D.json data
      const separatorX = getSeparatorX();
      const separatorXInSelection = separatorX ? separatorX - selectionBounds.left : selectionBounds.width;
      
      // Constrain X: can't go left of separator start, can't go right of separator (end of D.json)
      const minX = separatorX ? Math.max(0, separatorX - selectionBounds.left) : 0;
      const maxX = Math.min(separatorXInSelection, selectionBounds.width);
      
      // Only update X position (magnifier stays at fixed Y position - don't move vertically)
      const clampedX = Math.max(minX, Math.min(maxX, x));
      
      // Update position smoothly during drag
      setPosition(prev => {
        const newPos = { x: clampedX, y: prev.y };
        // Update lastTapPositionRef so we know where magnifier is during drag
        lastTapPositionRef.current = newPos;
        return newPos;
      });
      setIsDragging(true);
    };

    const handleChartTouchEnd = (e) => {
      if (!e.changedTouches || e.changedTouches.length === 0) return;
      
      // Prevent default chart click
      e.preventDefault();
      e.stopPropagation();
      
      // Find the ended touch
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
        // Touch ended but wasn't found - clean up anyway
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
      
      const touchDuration = Date.now() - touchStartTimeRef.current;
      const timeSinceLastTap = Date.now() - lastTapTimeRef.current;
      
      // Calculate final position
      const finalX = touch.clientX - selectionBounds.left;
      const separatorX = getSeparatorX();
      const separatorXInSelection = separatorX ? separatorX - selectionBounds.left : selectionBounds.width;
      const minX = separatorX ? Math.max(0, separatorX - selectionBounds.left) : 0;
      const maxX = Math.min(separatorXInSelection, selectionBounds.width);
      const clampedFinalX = Math.max(minX, Math.min(maxX, finalX));
      
      // Determine if this is a quick tap with minimal movement
      const isQuickTap = touchDuration < 300 && totalMovement < MOVEMENT_THRESHOLD;
      
      // Check if this is a second tap (selection) - user tapped again without moving much
      const distanceFromLastTap = lastTapPositionRef.current 
        ? Math.abs(clampedFinalX - lastTapPositionRef.current.x)
        : Infinity;
      
      const isSecondTap = hasPositionedRef.current && 
        isQuickTap &&
        timeSinceLastTap < DOUBLE_TAP_TIME && 
        distanceFromLastTap < POSITION_CHANGE_THRESHOLD &&
        totalMovement < MOVEMENT_THRESHOLD;
      
      if (isSecondTap) {
        // Second tap means "make a guess" - trigger selection at current magnifier position
        // Use the stored position (lastTapPositionRef) which is the actual magnifier position
        const magnifierPosition = lastTapPositionRef.current || { x: position.x, y: position.y };
        const selectionX = selectionBounds.left + magnifierPosition.x;
        const selectionY = selectionBounds.top + magnifierPosition.y;
        
        if (onSelectionRef.current) {
          const syntheticEvent = {
            clientX: selectionX,
            clientY: selectionY,
            preventDefault: () => {},
            stopPropagation: () => {},
          };
          onSelectionRef.current(syntheticEvent);
        }
        
        // Reset for next round
        hasPositionedRef.current = false;
        setHasBeenPositioned(false); // Hide magnified content for next round
        lastTapPositionRef.current = null;
        lastTapTimeRef.current = 0;
      } else {
        // First tap or drag - update position
        // This covers both quick taps (first positioning) and dragging
        setPosition(prev => {
          const newPos = { x: clampedFinalX, y: prev.y };
          lastTapPositionRef.current = newPos;
          lastTapTimeRef.current = Date.now();
          hasPositionedRef.current = true;
          setHasBeenPositioned(true); // Show magnified content after first interaction
          return newPos;
        });
      }
      
      setIsDragging(false);
      touchMoved = false;
      totalMovement = 0;
      initialTouch = null;
      activeTouchIdRef.current = null;
    };

    // Global touch handlers for moving magnifier even outside chart
    const handleGlobalTouchMove = (e) => {
      if (!e.touches || e.touches.length === 0 || activeTouchIdRef.current === null) return;
      
      // Find the active touch
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
      
      const x = touch.clientX - selectionBounds.left;
      
      // Get separator position - this marks the end of D.json data
      const separatorX = getSeparatorX();
      const separatorXInSelection = separatorX ? separatorX - selectionBounds.left : selectionBounds.width;
      
      // Constrain X: can't go left of separator start, can't go right of separator (end of D.json)
      const minX = separatorX ? Math.max(0, separatorX - selectionBounds.left) : 0;
      const maxX = Math.min(separatorXInSelection, selectionBounds.width);
      
      // Only update X position (magnifier stays at fixed Y position - don't move vertically)
      const clampedX = Math.max(minX, Math.min(maxX, x));
      
      // Update position smoothly during drag (even when dragging outside chart bounds)
      setPosition(prev => {
        const newPos = { x: clampedX, y: prev.y };
        // Update lastTapPositionRef during drag so position is always tracked
        lastTapPositionRef.current = newPos;
        return newPos;
      });
      setIsDragging(true);
    };

    // Handle touchcancel to clean up state
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
  }, [enabled, chartElement, isMobile, onSelection]);

  // Update magnified content position
  useEffect(() => {
    if (!chartElement || !magnifiedContentRef.current || !chartCloneRef.current) return;
    
    const selectionBounds = getSelectionAreaBounds();
    if (!selectionBounds) return;
    
    const scale = zoomLevel;
    // Calculate the offset needed to center the touched point in the magnifier
    // Position is relative to selection area, so we need to account for that
    const offsetX = (magnifierSize / 2) / scale - position.x;
    const offsetY = (magnifierSize / 2) / scale - position.y;
    
    if (chartCloneRef.current) {
      chartCloneRef.current.style.transform = `scale(${scale}) translate(${offsetX}px, ${offsetY}px)`;
      chartCloneRef.current.style.transformOrigin = 'top left';
    }
  }, [position, chartElement, magnifierSize, zoomLevel]);

  // CRITICAL: Don't show on desktop - MUST be after all hooks
  // Double-check to ensure magnifier never appears on desktop
  if (!enabled || !isMobile) {
    return null;
  }

  // Calculate magnifier position - bottom center of selection area, just above volume
  const selectionBounds = getSelectionAreaBounds();
  if (!selectionBounds || !chartElement) return null;

  // Position magnifier at bottom center of selection area
  // It moves horizontally with touch but stays vertically at bottom center
  const padding = 8; // Small padding above volume area
  const magnifierY = selectionBounds.bottom - magnifierSize / 2 - padding;
  
  // Move horizontally based on touch position, but keep within selection area bounds
  // Center the magnifier horizontally on the touch position
  const touchXInSelection = position.x;
  let magnifierX = selectionBounds.left + touchXInSelection - magnifierSize / 2;
  
  // Get separator position - this marks the end of D.json data
  const separatorX = getSeparatorX();
  
  // Constrain magnifier: can't go left of separator start, can't go right of separator (end of D.json)
  if (separatorX) {
    // The separator marks the right boundary - magnifier center can't go past it
    const separatorXInSelection = separatorX - selectionBounds.left;
    const minX = Math.max(selectionBounds.left, separatorX - magnifierSize / 2);
    // maxX is where the magnifier center can be - it's at separator minus half magnifier size
    const maxX = separatorX - magnifierSize / 2;
    magnifierX = Math.max(minX, Math.min(maxX, magnifierX));
  } else {
    // Fallback if separator not found - use full selection area
    const minX = selectionBounds.left;
    const maxX = selectionBounds.right - magnifierSize;
    magnifierX = Math.max(minX, Math.min(maxX, magnifierX));
  }

  return (
    <>
      {/* Magnifier - Always displayed as part of chart */}
      {chartElement && (
        <div
          ref={magnifierRef}
          className="absolute z-50 pointer-events-none transition-all duration-150"
          style={{
            left: `${magnifierX - selectionBounds.left}px`,
            top: `${magnifierY - selectionBounds.top}px`,
            width: `${magnifierSize}px`,
            height: `${magnifierSize}px`,
            transform: isDragging ? 'scale(1.05)' : 'scale(1)',
          }}
        >
          {/* Magnifier container */}
          <div
            className="absolute inset-0 rounded-full overflow-hidden"
            style={{
              background: 'rgba(0, 0, 0, 0.85)',
              border: isDragging 
                ? '2px solid rgba(0, 255, 255, 0.5)' 
                : '1.5px solid rgba(0, 255, 255, 0.35)',
              boxShadow: isDragging
                ? '0 4px 20px rgba(0, 255, 255, 0.3), inset 0 0 30px rgba(0, 255, 255, 0.08)'
                : '0 2px 12px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(0, 255, 255, 0.05)',
              transition: 'all 0.15s ease-out',
            }}
          >
            {/* Magnified chart content */}
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
            
            {/* Center crosshair for precise targeting */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Horizontal line */}
              <div 
                className="absolute top-1/2 left-0 right-0 h-px bg-turquoise-400"
                style={{ 
                  transform: 'translateY(-50%)',
                  opacity: isDragging ? 0.7 : 0.5,
                }}
              />
              {/* Vertical line */}
              <div 
                className="absolute left-1/2 top-0 bottom-0 w-px bg-turquoise-400"
                style={{ 
                  transform: 'translateX(-50%)',
                  opacity: isDragging ? 0.7 : 0.5,
                  }}
              />
              {/* Center dot */}
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

