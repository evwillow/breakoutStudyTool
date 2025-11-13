/**
 * @fileoverview Renders interactive OHLC stock charts with overlays, volume, and moving averages for drills.
 * @module src/web/components/StockChart/StockChart.tsx
 * @dependencies React, d3-scale, d3-shape, ./StockChart.types
 */
"use client";

/**
 * @component StockChart
 * @overview High-performance SVG/canvas hybrid that visualizes OHLC candles, volume, and moving averages for study drills.
 * @usage ```tsx
 * import StockChart from "@/components/StockChart";
 *
 * <StockChart data={processedCandles} chartType="default" onChartClick={handleSelect} />
 * ```
 * @when Render inside study experiences or analytics views that require interactive market replays and tutorial overlays.
 */
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  ChartType,
  ProcessedStockDataPoint,
  ChartCoordinate,
  ChartClickHandler,
  ChartDimensions,
  StockChartProps,
  LastDimensions,
  DragStartPos,
  ContainerRef,
  CandlestickData,
  VolumeBarData
} from './StockChart.types';
import { getChartConfig } from "./config";
import { useChartData } from "./hooks/useChartData";
import { useChartScale } from "./hooks/useChartScale";


/**
 * StockChart component renders price and volume data with optional moving averages
 */
const StockChart = React.memo<StockChartProps>(({ 
  data,
  csvData,
  afterData = null,
  showSMA = true, 
  includeAuth = false, 
  chartType = 'default', 
  height = null,
  backgroundColor = null,
  showAfterAnimation = false,
  progressPercentage = 100,
  zoomPercentage = 100,
  isInDelayPhase = false,
  afterAnimationComplete = false,
  forceShowSMA = false,
  tightPadding = false,
  onChartClick = null,
  userSelection = null,
  targetPoint = null,
  disabled = false,
  timerRightEdge = null,
  timerLeftEdge = null,
  dLabelRightEdge = null,
  dLabelCenterY = null
}) => {
  /** Tracks whether auth modal prompting appears when gated interactions trigger. */
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  /** Responsive breakpoint flag derived from container viewport to toggle compact rendering. */
  const [isMobile, setIsMobile] = useState<boolean>(false);
  /** Cached measurements governing SVG scales and redraw logic. */
  const [dimensions, setDimensions] = useState<ChartDimensions | null>(null);
  const containerRef = useRef<ContainerRef | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const lastDimensionsRef = useRef<LastDimensions>({ width: 0, height: 0 });
  const handleChartClickRef = useRef<ChartClickHandler | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartPosRef = useRef<DragStartPos>({ x: 0, y: 0 });
  const isInSelectableAreaRef = useRef<boolean>(false);
  
  // Use either data or csvData prop
  const chartData = data || csvData;
  const shouldRenderSMA = showSMA || forceShowSMA;
  
  // Handle container resize with debounce for performance
  useEffect(() => {
    const updateDimensions = (): void => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const isMobileView = window.innerWidth < 1024 || 'ontouchstart' in window; // Match ChartSection's mobile detection
        
        // Use the container's actual height (set by parent's aspect ratio)
        // This respects the parent container's aspect ratio on both mobile and desktop
        let containerHeight = containerRef.current.clientHeight;
        
        // If height is not available yet (container not fully rendered), try parent
        if (!containerHeight || containerHeight < 400) {
          const parent = containerRef.current.parentElement;
          containerHeight = parent?.clientHeight || parent?.offsetHeight || 0;
          
          // If still no height, try to get it from the parent's computed style (aspect ratio)
          if ((!containerHeight || containerHeight < 400) && parent) {
            const computedStyle = window.getComputedStyle(parent);
            const parentHeight = computedStyle.height;
            if (parentHeight && parentHeight !== 'auto' && parentHeight !== 'none') {
              const parsed = parseFloat(parentHeight);
              if (!isNaN(parsed) && parsed > 0) {
                containerHeight = parsed;
              }
            }
          }
          
          // Final fallback: calculate based on width
          // On mobile, use 4/5 aspect ratio (taller rectangle)
          // On desktop, use 1/1 aspect ratio (square)
          if (!containerHeight || containerHeight < 400) {
            if (isMobileView) {
              // Calculate height based on 4/5 aspect ratio (taller rectangle for mobile)
              containerHeight = containerWidth * 1.25; // 4/5 = 0.8, so height = width / 0.8 = width * 1.25
              
              // Cap at maxHeight if set
              if (parent) {
                const computedStyle = window.getComputedStyle(parent);
                const parentMaxHeight = computedStyle.maxHeight;
                if (parentMaxHeight && parentMaxHeight !== 'none' && parentMaxHeight !== 'auto') {
                  const parsed = parseFloat(parentMaxHeight);
                  if (!isNaN(parsed)) {
                    containerHeight = Math.min(containerHeight, parsed);
                  }
                }
              }
            } else {
              // Desktop: square aspect ratio
              containerHeight = containerWidth;
            }
          }
        }
        
        // Ensure minimum height
        containerHeight = Math.max(containerHeight, 500);
        
        setIsMobile(isMobileView);
        
        const margin = tightPadding
          ? { top: 0, right: 0, bottom: 0, left: 0 }
          : {
              top: 0,
              right: isMobileView ? 10 : 15,
              bottom: 0,
              left: isMobileView ? 10 : 15,
            };
        
        const innerWidth = Math.max(containerWidth - margin.left - margin.right, 0);
        const innerHeight = Math.max(containerHeight - margin.top - margin.bottom, 0);
        
        // Only update dimensions if they actually changed (prevent feedback loop)
        const newDims: ChartDimensions = {
          width: containerWidth,
          height: containerHeight,
          margin,
          innerWidth,
          innerHeight
        };
        
        // Check if dimensions actually changed (more than 1px difference to account for rounding)
        const hasChanged = 
          Math.abs(lastDimensionsRef.current.width - containerWidth) > 1 ||
          Math.abs(lastDimensionsRef.current.height - containerHeight) > 1;
        
        if (hasChanged) {
          lastDimensionsRef.current = { width: containerWidth, height: containerHeight };
          setDimensions(newDims);
        }
      }
    };

    // Create ResizeObserver with debounced handler
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = (): void => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateDimensions, 150);
    };

    // Initial dimensions
    updateDimensions();

    // Create resize observer - only observe container size changes, not content changes
    // Use ResizeObserver on the container itself to track size changes
    const resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      // Only update if the container's actual size changed (not content size)
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (Math.abs(lastDimensionsRef.current.width - width) > 1 ||
            Math.abs(lastDimensionsRef.current.height - height) > 1) {
          debouncedResize();
        }
      }
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Also listen to window resize for mobile orientation changes
    window.addEventListener('resize', debouncedResize);

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', debouncedResize);
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, [tightPadding]);
  
  // Get responsive chart configuration
  const CHART_CONFIG = useMemo(() => getChartConfig(isMobile, chartType), [isMobile, chartType]);

  if (!chartData) {
    // Return empty div to maintain layout - parent will handle loading state
    return <div ref={containerRef} className="w-full h-full min-h-[400px] bg-black transition-opacity duration-500 ease-in-out" />;
  }

  const {
    stockData,
    afterStockData,
    visibleAfterData,
    hasSMA10,
    hasSMA20,
    hasSMA50,
    shouldShowBackground
  } = useChartData({
    chartData,
    afterData,
    chartType,
    progressPercentage
  });

  // Calculate scales with zoom out for combined data view
  // Create line generators for SMA
  // Create line generators for SMA20 and SMA50 (similar to SMA10)
  // Create SMA line generators for after data
  const {
    scales,
    sma10Line,
    sma20Line,
    sma50Line,
    afterSma10Line,
    afterSma20Line,
    afterSma50Line
  } = useChartScale({
    dimensions,
    stockData,
    afterStockData,
    visibleAfterData,
    hasSMA10,
    hasSMA20,
    hasSMA50,
    zoomPercentage,
    isMobile,
    chartType,
    tightPadding,
    onChartClick,
    shouldRenderSMA
  });

  // Create candlestick elements for main data
  const candlesticks = useMemo<CandlestickData[]>(() => {
    if (!scales || !stockData || stockData.length === 0) {
      return [];
    }
    
    // Check if scales are properly initialized
    if (!scales.xScale || !scales.priceScale) {
      console.warn("Scales not properly initialized, skipping candlestick generation");
      return [];
    }
    
    
    const result = stockData.map((d: ProcessedStockDataPoint, i: number): CandlestickData | null => {
      // More flexible property access - check various property names
      const getPrice = (item: ProcessedStockDataPoint, props: string[]): number | null => {
        for (const prop of props) {
          if (item[prop] !== undefined && item[prop] !== null) {
            const val = parseFloat(String(item[prop]));
            return isNaN(val) ? null : val;
          }
        }
        return null;
      };
      
      // Get OHLC values with fallbacks for different property names
      const open = getPrice(d, ['open', 'Open', 'OPEN']);
      const high = getPrice(d, ['high', 'High', 'HIGH']);
      const low = getPrice(d, ['low', 'Low', 'LOW']);
      const close = getPrice(d, ['close', 'Close', 'CLOSE']);
      
      
      // Skip invalid data points
      if (open === null || high === null || low === null || close === null) {
        if (i === 0) console.warn('Missing price data on first point:', d);
        return null;
      }
      
      // Skip if prices are all zero or extremely small (likely bad data)
      const isTooSmall = (open <= 0.0001 && high <= 0.0001 && low <= 0.0001 && close <= 0.0001);
      if (isTooSmall) {
        if (i === 0) console.warn('Values too small on data point, likely bad data:', { open, high, low, close });
        return null;
      }
      
      // Skip if high and low are the same (would create a flat line)
      if (Math.abs(high - low) < 0.0001) {
        if (i === 0) console.warn('High and low are identical, skipping point');
        return null;
      }
      
      try {
        // Calculate position using scale - works for both normal and zoomed out modes
        const x = scales.xScale(i);
        // If x is undefined or NaN, use a simple fallback calculation
        const finalX = (x === undefined || isNaN(x)) 
          ? (i * (dimensions!.innerWidth / (scales.isZoomedOut ? stockData.length + afterStockData.length : stockData.length))) 
          : x;
          
        const width = scales.xScale.step() * 0.8;
        const openY = scales.priceScale(open);
        const closeY = scales.priceScale(close);
        const highY = scales.priceScale(high);
        const lowY = scales.priceScale(low);
        const isUp = close > open;
        
        // Skip if any positions are invalid
        if (isNaN(openY) || isNaN(closeY) || isNaN(highY) || isNaN(lowY)) {
          return null;
        }
      
        return {
          x: finalX,
          openY,
          closeY,
          highY,
          lowY,
          width: width || 6, // Fallback width if calculation fails
          isUp
        };
      } catch (err) {
        console.error(`Error generating candlestick for index ${i}:`, err);
        return null;
      }
    }).filter((item): item is CandlestickData => item !== null); // Remove any null entries
    
    return result;
  }, [scales, stockData, dimensions, zoomPercentage, afterStockData.length]);
  
  // Create volume bars generator - simplified approach
  const volumeBars = useMemo<VolumeBarData[]>(() => {
    if (!scales || !stockData || stockData.length === 0) {
      return [];
    }
    
    
    const result = stockData.map((d: ProcessedStockDataPoint, i: number): VolumeBarData | null => {
      // More flexible property access for volume
      const getVolume = (item: ProcessedStockDataPoint): number | null => {
        for (const prop of ['volume', 'Volume', 'VOLUME']) {
          if (item[prop] !== undefined && item[prop] !== null) {
            const val = parseFloat(String(item[prop]));
            return isNaN(val) ? null : val;
          }
        }
        return null;
      };
      
      const volume = getVolume(d);
      
      // Skip invalid data points
      if (volume === null) {
        return null;
      }
      
      try {
        // Calculate position using scale - works for both normal and zoomed out modes
        const x = scales.xScale(i);
        // If x is undefined or NaN, use a simple fallback calculation
        const finalX = (x === undefined || isNaN(x)) 
          ? (i * (dimensions!.innerWidth / (scales.isZoomedOut ? stockData.length + afterStockData.length : stockData.length))) 
          : x;
          
        const width = scales.xScale.step() * 0.8;
        // volumeScale maps volume to y position: [0, volumeMax] -> [volumeHeight, 0]
        // So volumeScale(volume) gives the y position from the top
        const topY = scales.volumeScale(volume);
      
        // Skip if any positions are invalid
        if (isNaN(topY)) {
          return null;
        }
      
        // For previous charts, ensure bars reach the bottom (no gap)
        // Bar should go from topY to volumeHeight (bottom)
        // Calculate bar height to ensure it always reaches the bottom
        let barHeight = scales.volumeHeight - topY;
        const barY = topY;
        
        // For previous charts, ensure the bar actually reaches the bottom
        // Adjust bar height to account for any floating point precision issues
        if (chartType === 'previous') {
          // Ensure bar reaches exactly to volumeHeight (bottom of volume area)
          // Add a tiny amount if needed to close any gap due to floating point precision
          const targetBottom = scales.volumeHeight;
          const actualBottom = barY + barHeight;
          if (actualBottom < targetBottom - 0.1) {
            // If there's a noticeable gap (>0.1px), extend the bar to close it
            barHeight = targetBottom - barY;
          }
        }
      
        return {
          x: finalX - (width / 2),
          y: barY,
          width: width || 6, // Fallback width if calculation fails
          height: barHeight
        };
      } catch (err) {
        console.error(`Error generating volume bar for index ${i}:`, err);
        return null;
      }
    }).filter((item): item is VolumeBarData => item !== null); // Remove any null entries
    
    return result;
  }, [scales, stockData, dimensions, zoomPercentage, afterStockData.length, chartType]);

  // Create candlestick elements for after data with progressive reveal
  const afterCandlesticks = useMemo<CandlestickData[]>(() => {
    // Only show after candlesticks when zoomed out and animation is active
    if (!scales || !scales.isZoomedOut || !showAfterAnimation || !visibleAfterData || visibleAfterData.length === 0) {
      return [];
    }
    
    // Calculate offset based on original data length
    const offset = stockData.length;
    
    
    const result = visibleAfterData.map((d: ProcessedStockDataPoint, i: number): CandlestickData | null => {
      // More flexible property access - check various property names
      const getPrice = (item: ProcessedStockDataPoint, props: string[]): number | null => {
        for (const prop of props) {
          if (item[prop] !== undefined && item[prop] !== null) {
            const val = parseFloat(String(item[prop]));
            return isNaN(val) ? null : val;
          }
        }
        return null;
      };
      
      // Get OHLC values with fallbacks for different property names
      const open = getPrice(d, ['open', 'Open', 'OPEN']);
      const high = getPrice(d, ['high', 'High', 'HIGH']);
      const low = getPrice(d, ['low', 'Low', 'LOW']);
      const close = getPrice(d, ['close', 'Close', 'CLOSE']);
      
      // Skip invalid data points
      if (open === null || high === null || low === null || close === null) {
        return null;
      }
      
      // Skip if prices are all zero or extremely small (likely bad data)
      const isTooSmall = (open <= 0.0001 && high <= 0.0001 && low <= 0.0001 && close <= 0.0001);
      if (isTooSmall) {
        return null;
      }
      
      // Skip if high and low are the same (would create a flat line)
      if (Math.abs(high - low) < 0.0001) {
        return null;
      }
      
      try {
        // Calculate position using scale - in zoom out mode, use the full combined scale
        const index = offset + i;
        const x = scales.xScale(index);
        // If x is undefined or NaN, use a simple fallback calculation
        if (!dimensions) return null;
        const finalX = (x === undefined || isNaN(x)) 
          ? ((offset + i) * (dimensions.innerWidth / (stockData.length + afterStockData.length))) 
          : x;
          
        const width = scales.xScale.step() * 0.8;
        const openY = scales.priceScale(open);
        const closeY = scales.priceScale(close);
        const highY = scales.priceScale(high);
        const lowY = scales.priceScale(low);
        const isUp = close > open;
        
        // Skip if any positions are invalid
        if (isNaN(openY) || isNaN(closeY) || isNaN(highY) || isNaN(lowY)) {
          return null;
        }
      
        return {
          x: finalX,
          openY,
          closeY,
          highY,
          lowY,
          width: width || 6, // Fallback width if calculation fails
          isUp
        };
      } catch (err) {
        console.error(`Error generating after candlestick for index ${i}:`, err);
        return null;
      }
    }).filter((item): item is CandlestickData => item !== null); // Remove any null entries
    
    return result;
  }, [scales, stockData.length, visibleAfterData, dimensions, showAfterAnimation, zoomPercentage, progressPercentage, afterStockData.length]);

  // Create volume bars for after data with the same simplified approach
  const afterVolumeBars = useMemo<VolumeBarData[]>(() => {
    // Only show after volume bars when zoomed out and animation is active
    if (!scales || !scales.isZoomedOut || !showAfterAnimation || !visibleAfterData || visibleAfterData.length === 0) {
      return [];
    }
    
    // Calculate offset based on original data length
    const offset = stockData.length;
    
    
    const result = visibleAfterData.map((d: ProcessedStockDataPoint, i: number): VolumeBarData | null => {
      // More flexible property access for volume
      const getVolume = (item: ProcessedStockDataPoint): number | null => {
        for (const prop of ['volume', 'Volume', 'VOLUME']) {
          if (item[prop] !== undefined && item[prop] !== null) {
            const val = parseFloat(String(item[prop]));
            return isNaN(val) ? null : val;
          }
        }
        return null;
      };
      
      const volume = getVolume(d);
      
      // Skip invalid data points
      if (volume === null) {
        return null;
      }
      
      try {
        // Calculate position using scale - in zoom out mode, use the full combined scale
        const index = offset + i;
        const x = scales.xScale(index);
        // If x is undefined or NaN, use a simple fallback calculation
        if (!dimensions) return null;
        const finalX = (x === undefined || isNaN(x)) 
          ? ((offset + i) * (dimensions.innerWidth / (stockData.length + afterStockData.length))) 
          : x;
          
        const width = scales.xScale.step() * 0.8;
        const height = scales.volumeScale(volume);
        
        // Skip if any positions are invalid
        if (isNaN(height)) {
          return null;
        }
      
        return {
          x: finalX - (width / 2),
          y: scales.volumeHeight - height,
          width: width || 6, // Fallback width if calculation fails
          height
        };
      } catch (err) {
        console.error(`Error generating after volume bar for index ${i}:`, err);
        return null;
      }
    }).filter((item): item is VolumeBarData => item !== null);
    
    return result;
  }, [scales, stockData.length, visibleAfterData, dimensions, showAfterAnimation, zoomPercentage, progressPercentage, afterStockData.length]);

  // Handle chart click - MUST be before any early returns to avoid hook order issues
  const handleChartClick = useCallback((event: React.MouseEvent<SVGSVGElement>): void => {
    // Debug logging to help identify why selection might not be working
    if (!onChartClick) {
      console.log("Chart click blocked: onChartClick is not provided");
      return;
    }
    if (disabled) {
      console.log("Chart click blocked: chart is disabled");
      return;
    }
    if (!scales || !dimensions || !svgRef.current || !stockData || stockData.length === 0) {
      console.log("Chart click blocked: chart not ready", { scales: !!scales, dimensions: !!dimensions, svgRef: !!svgRef.current, stockData: stockData?.length || 0 });
      return;
    }
    
    const svgRect = svgRef.current.getBoundingClientRect();
    const point = svgRef.current.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const svgPoint = point.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    if (!svgPoint) return;
    
    // Get chart coordinates (accounting for margins)
            const chartX = svgPoint.x - (dimensions!.margin.left || 0);
            const chartY = svgPoint.y - (dimensions.margin.top || 0);
    
    // Get the last data point index and position
    const lastDataIndex = stockData.length - 1;
    const lastDataCenterX = scales.xScale(lastDataIndex);
    if (lastDataCenterX === undefined) return;
    const step = scales.xScale.step();
    // Calculate the right edge of the last data bar (center + half step)
    const lastDataRightEdge = lastDataCenterX + (step / 2);
    
    // ONLY allow selection AFTER the right edge of the last data point (future predictions only)
    if (chartX <= lastDataRightEdge) {
      // Click is on or before existing data - don't allow selection
      console.log("Selection must be after the last data point. Clicked at:", chartX, "Last data right edge at:", lastDataRightEdge);
      return;
    }
    
    // Extrapolate: extend time index beyond data
    const stepsBeyond = Math.max(0, Math.round((chartX - lastDataRightEdge) / step));
    const selectedIndex = lastDataIndex + stepsBeyond + 1;
    
    // Invert yScale to get price (supports clicking above/below visible range)
    const price = Math.max(0, scales.priceScale.invert(chartY));
    
    console.log("Selection made - Index:", selectedIndex, "Price:", price, "Last data index:", lastDataIndex, "Chart coordinates:", { chartX, chartY });
    
    // Call parent handler with coordinates
    if (onChartClick) {
      onChartClick({
        x: selectedIndex,
        y: price,
        chartX: chartX,
        chartY: chartY
      });
      console.log("Selection coordinates passed to parent handler");
    } else {
      console.warn("onChartClick handler is not available");
    }
  }, [onChartClick, disabled, scales, dimensions, stockData]);

  // Expose handleChartClick via ref so parent can call it directly
  // This must be after handleChartClick is defined
  useEffect(() => {
    if (containerRef.current) {
      (containerRef.current as any).handleChartClick = handleChartClick;
      handleChartClickRef.current = handleChartClick as any;
    }
  }, [handleChartClick]);

  // Helper function to check if a position is in the selectable area
  const isInSelectableArea = useCallback((chartX: number): boolean => {
    if (!scales || !stockData || stockData.length === 0) return false;
    
    const lastDataIndex = stockData.length - 1;
    const lastDataCenterX = scales.xScale(lastDataIndex);
    if (lastDataCenterX === undefined) return false;
    const step = scales.xScale.step();
    const borderLineOffsetForCursor = isMobile ? 1.0 : 1.5;
    const lastDataRightEdge = lastDataCenterX + (step / 2) + (step * borderLineOffsetForCursor);
    
    return chartX > lastDataRightEdge;
  }, [scales, stockData, isMobile]);

  // Handle mouse down to track dragging
  const handleMouseDown = useCallback((event: React.MouseEvent<SVGSVGElement>): void => {
    if (!onChartClick || disabled || !scales || !stockData || stockData.length === 0 || !svgRef.current) {
      return;
    }

    try {
      const point = svgRef.current.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const svgPoint = point.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
      if (!svgPoint) return;
      const chartX = svgPoint.x - (dimensions!.margin.left || 0);
      
      isInSelectableAreaRef.current = isInSelectableArea(chartX);
      isDraggingRef.current = true;
      dragStartPosRef.current = { x: event.clientX, y: event.clientY };
      
      // If not in selectable area, allow default behavior (scrolling)
      if (!isInSelectableAreaRef.current) {
        // Don't prevent default - allow scrolling
        return;
      }
    } catch (err) {
      console.error('Error in handleMouseDown:', err);
    }
  }, [onChartClick, disabled, scales, stockData, dimensions, isInSelectableArea]);

  // Handle mouse move during drag
  const handleMouseMove = useCallback((event: React.MouseEvent<SVGSVGElement>): void => {
    if (!isDraggingRef.current) {
      // Update cursor based on position - only if chart is selectable
      if (!onChartClick || disabled || !scales || !stockData || stockData.length === 0 || !svgRef.current) {
        if (svgRef.current) svgRef.current.style.cursor = 'default';
        return;
      }
      
      try {
        const point = svgRef.current.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        const svgPoint = point.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
        if (!svgPoint) return;
        
        const chartX = svgPoint.x - (dimensions!.margin.left || 0);
        const lastDataIndex = stockData.length - 1;
        const lastDataCenterX = scales.xScale(lastDataIndex);
        if (lastDataCenterX === undefined) return;
        const step = scales.xScale.step();
        const borderLineOffsetForCursor = isMobile ? 1.0 : 1.5;
        const lastDataRightEdge = lastDataCenterX + (step / 2) + (step * borderLineOffsetForCursor);
        
        // Set cursor based on position: not-allowed in data area, crosshair (clickable) in selection area
        if (chartX <= lastDataRightEdge) {
          svgRef.current.style.cursor = 'not-allowed';
        } else {
          svgRef.current.style.cursor = 'crosshair';
        }
      } catch (err) {
        // Fallback to default cursor on error
        if (svgRef.current) svgRef.current.style.cursor = 'default';
      }
      return;
    }

    // If dragging in non-selectable area, allow scrolling (don't prevent default)
    if (!isInSelectableAreaRef.current) {
      return;
    }

    // If dragging in selectable area, we could add selection preview here if needed
  }, [onChartClick, disabled, scales, stockData, dimensions, isMobile]);

  // Handle mouse up to end dragging
  const handleMouseUp = useCallback((event: React.MouseEvent<SVGSVGElement>): void => {
    if (!isDraggingRef.current) return;
    
    isDraggingRef.current = false;
    isInSelectableAreaRef.current = false;
  }, []);

  // Add global mouse up listener to handle mouse up outside the chart
  useEffect(() => {
    const handleGlobalMouseUp = (): void => {
      isDraggingRef.current = false;
      isInSelectableAreaRef.current = false;
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  // Handle touch events for mobile scrolling
  const handleTouchStart = useCallback((event: React.TouchEvent<SVGSVGElement>): void => {
    if (!onChartClick || disabled || !scales || !stockData || stockData.length === 0 || !svgRef.current) {
      return;
    }

    try {
      const touch = event.touches[0];
      if (!touch) return;
      const point = svgRef.current.createSVGPoint();
      point.x = touch.clientX;
      point.y = touch.clientY;
      const svgPoint = point.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
      if (!svgPoint) return;
      const chartX = svgPoint.x - (dimensions!.margin.left || 0);
      
      isInSelectableAreaRef.current = isInSelectableArea(chartX);
      isDraggingRef.current = true;
      dragStartPosRef.current = { x: touch.clientX, y: touch.clientY };
      
      // If not in selectable area, allow default behavior (scrolling)
      if (!isInSelectableAreaRef.current) {
        // Don't prevent default - allow scrolling
        return;
      }
    } catch (err) {
      console.error('Error in handleTouchStart:', err);
    }
  }, [onChartClick, disabled, scales, stockData, dimensions, isInSelectableArea]);

  const handleTouchMove = useCallback((event: React.TouchEvent<SVGSVGElement>): void => {
    // If dragging in non-selectable area, allow scrolling (don't prevent default)
    if (!isDraggingRef.current || !isInSelectableAreaRef.current) {
      return;
    }
    // If in selectable area, we could prevent default here if needed for selection
  }, []);

  const handleTouchEnd = useCallback((event: React.TouchEvent<SVGSVGElement>): void => {
    isDraggingRef.current = false;
    isInSelectableAreaRef.current = false;
  }, []);

  // Early return check AFTER all hooks
  if (!dimensions || !scales || !stockData.length) {
    // Return empty div to maintain layout - parent will handle loading state
    return <div ref={containerRef} className="w-full h-full min-h-[400px] bg-black" />;
  }

  // Show a progress indicator during animation
  const progressIndicator = false; // Remove percentage display
  
  // Calculate the x position and width for the dark background
  // NEW ZOOM OUT LOGIC: When zoomed out, always show the divider line and background
  // IMPORTANT: For D charts, show divider/background animation but never reveal actual after.json data
  const isDChart = chartType === 'default' || chartType === 'D';
  const shouldShowDividerAndBackground = (zoomPercentage > 0 && afterStockData.length > 0) || shouldShowBackground;
  
  // Calculate divider line position - FIXED POSITION on screen (always same position)
  // Use a fixed percentage of container width to ensure divider stays in same screen position
  // This matches the dashed separator line position for consistency
  let dividerLineX: number;
  let darkBackgroundWidth: number;
  
  // Fixed position: matches the dashed separator line position
  // Mobile: 70% to give more space for selection, Desktop: 75%
  const DIVIDER_POSITION_PERCENT = isMobile ? 0.70 : 0.75; // Mobile: 70%, Desktop: 75%
  
  if (scales && dimensions && stockData.length > 0 && afterStockData.length > 0) {
    // Calculate fixed position based on container width
    // Position is relative to the inner area (after left margin)
    dividerLineX = dimensions.margin.left + (dimensions.innerWidth * DIVIDER_POSITION_PERCENT);
    
    // Background covers from divider to end of chart
    darkBackgroundWidth = dimensions.width - dividerLineX;
  } else {
    dividerLineX = 0;
    darkBackgroundWidth = 0;
  }
  
  // Calculate progressive reveal mask position for the background
  const getProgressiveMaskWidth = (): number => {
    if (!showAfterAnimation || progressPercentage >= 100) return 0;
    
    // Calculate mask width based on progress percentage
    const fullWidth = darkBackgroundWidth;
    const visibleWidth = (progressPercentage / 100) * fullWidth;
    return fullWidth - visibleWidth;
  };

  const progressiveMaskWidth = getProgressiveMaskWidth();

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full stock-chart-container"
      style={{ position: 'relative', width: '100%', height: '100%', minHeight: chartType === 'hourly' ? '0' : '400px' }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${(() => {
          if (chartType === 'previous') {
            // Calculate extended width to match xScale range multiplier
            const xScaleRangeMultiplier = isMobile ? 1.1 : 1.25;
            return dimensions.margin.left + dimensions.innerWidth * xScaleRangeMultiplier + dimensions.margin.right;
          }
          return dimensions.width;
        })()} ${dimensions.height}`}
        className={`w-full h-full transition-opacity duration-500 ease-in-out ${onChartClick && !disabled ? 'chart-selectable' : ''}`}
        preserveAspectRatio={
          tightPadding
            ? 'none'
            : chartType === 'hourly'
              ? 'xMidYMid slice'
              : chartType === 'previous'
                ? 'xMinYMid meet'
                : 'xMidYMid meet'
        }
        onClick={handleChartClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          // Reset to default when leaving chart
          if (svgRef.current) svgRef.current.style.cursor = 'default';
          isDraggingRef.current = false;
          isInSelectableAreaRef.current = false;
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ display: 'block', width: '100%', height: '100%', cursor: (onChartClick && !disabled) ? 'crosshair' : 'default', pointerEvents: 'auto', touchAction: 'pan-y pan-x' }}
      >
        {/* Add CSS to ensure proper sizing */}
        <defs>
          <style>
            {`
              @media (max-width: 768px) {
                .stock-chart-container {
                  width: 100% !important;
                  min-height: 400px;
                }
                .stock-chart-container svg {
                  width: 100% !important;
                  height: 100% !important;
                }
              }
              
              /* Cursor styling will be handled dynamically via JavaScript */
              .chart-selectable {
                cursor: not-allowed;
              }
            `}
          </style>
        </defs>
        
        {/* Background fill when backgroundColor is provided */}
        {backgroundColor && (
          <rect
            x={0}
            y={0}
            width={dimensions.width}
            height={dimensions.height}
            fill={backgroundColor}
          />
        )}
        
        {/* SMA Legend - Removed: Now rendered as HTML in ChartSection for D chart */}
        {false && (showSMA || forceShowSMA) && chartType !== 'monthly' && chartType !== 'M' && chartType !== 'minute' && chartType !== 'hourly' && chartType !== 'H' && dimensions && (() => {
          // Calculate SMA label position
          // Position just to the right of the D label, at the top
          const labelWidth = 110;
          const defaultX = Math.max((dimensions!.margin?.left || 0) + 50, 50);
          
          let smaLabelX = defaultX;
          // Position just to the right of D label if we have the edge
          if (dLabelRightEdge !== null && dLabelRightEdge! > 0) {
            // Position just to the right of D label with small padding
            smaLabelX = dLabelRightEdge! + 8;
            // Ensure it's not too far left
            if (smaLabelX < defaultX) {
              smaLabelX = defaultX;
            }
          } else if (timerRightEdge !== null && timerRightEdge! > 0) {
            // Fallback: align right edge of label with timer's right edge
            smaLabelX = Math.max(timerRightEdge! - labelWidth, defaultX);
          }
          
          // Position at the top, aligned with D label and timer (same Y center as they are)
          // Use the D label's center Y if available, otherwise use default top position
          let smaLabelY: number;
          if (dLabelCenterY !== null && dLabelCenterY! > 0) {
            // Position SMA labels to align with D label's vertical center
            // For daily charts, SMA labels have 3 lines (10, 20, 50) with height 56px
            // The center of the label group is approximately at y="28" from the group origin
            // (rect starts at y="-6" with height 56, center is at y="22", but text center is around y="27")
            // We want the center of the SMA label (around y="27") to align with D label center
            const smaLabelCenterOffset = 27; // Approximate center of the 3-line SMA label
            smaLabelY = dLabelCenterY! - smaLabelCenterOffset;
          } else {
            // Fallback: position at top
            smaLabelY = Math.max((dimensions!.margin?.top || 0) + 8, 8);
          }
          
          return (
          <g 
            transform={`translate(${smaLabelX}, ${smaLabelY})`} 
            style={{ pointerEvents: 'none' }}
          >
            {/* Background rectangle for better readability - adjust height based on whether SMA50 is shown */}
            {(() => {
              const showSMA50InLegend = (chartType === 'hourly' || chartType === 'H') ? false : (chartType === 'default' || chartType === 'D' || hasSMA50);
              const legendHeight = (chartType === 'hourly' || chartType === 'H') 
                ? "46" 
                : "56";
              return (
                <rect 
                  x="-6" 
                  y="-6" 
                  width="110" 
                  height={legendHeight} 
                  fill="rgba(0, 0, 0, 0.95)" 
                  rx="4" 
                  stroke="rgba(255, 255, 255, 0.3)" 
                  strokeWidth="1"
                />
              );
            })()}
            
            {/* 10 SMA - Always show for hourly charts */}
            {(chartType === 'hourly' || chartType === 'H' || chartType === 'default' || chartType === 'D' || hasSMA10) && (
              <g transform="translate(0, 0)">
                <line x1="0" y1="6" x2="18" y2="6" stroke={CHART_CONFIG.COLORS.SMA10} strokeWidth="2.5" strokeLinecap="round" />
                <text 
                  x="24" 
                  y="9" 
                  fontSize={isMobile ? "11" : "12"} 
                  fill="rgba(255, 255, 255, 0.9)" 
                  fontWeight="500"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  10 SMA
                </text>
              </g>
            )}
            
            {/* 20 SMA - Always show for hourly charts */}
            {(chartType === 'hourly' || chartType === 'H' || chartType === 'default' || chartType === 'D' || hasSMA20) && (
              <g transform="translate(0, 18)">
                <line x1="0" y1="6" x2="18" y2="6" stroke={CHART_CONFIG.COLORS.SMA20} strokeWidth="2.5" strokeLinecap="round" />
                <text 
                  x="24" 
                  y="9" 
                  fontSize={isMobile ? "11" : "12"} 
                  fill="rgba(255, 255, 255, 0.9)" 
                  fontWeight="500"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  20 SMA
                </text>
              </g>
            )}
            
            {/* 50 SMA - Only show for daily/default charts (not hourly) */}
            {(chartType !== 'hourly' && chartType !== 'H') && (chartType === 'default' || chartType === 'D' || hasSMA50) && (
              <g transform="translate(0, 36)">
                <line x1="0" y1="6" x2="18" y2="6" stroke={CHART_CONFIG.COLORS.SMA50} strokeWidth="2.5" strokeLinecap="round" />
                <text 
                  x="24" 
                  y="9" 
                  fontSize={isMobile ? "11" : "12"} 
                  fill="rgba(255, 255, 255, 0.9)" 
                  fontWeight="500"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  50 SMA
                </text>
              </g>
            )}
          </g>
          );
        })()}
        
        {/* Dark background for after data area only - only applies to the main chart (D) */}
        {shouldShowDividerAndBackground && !backgroundColor && chartType !== 'previous' && (
          <>
            {/* Vertical divider line EXACTLY at the split point boundary */}
            <line
              x1={dividerLineX}
              y1={0}
              x2={dividerLineX}
              y2={dimensions.height}
              stroke="#00FFFF"
              strokeWidth={2.5}
              opacity={1}
            />
          
            <rect
              x={dividerLineX}
              y={0}
              width={darkBackgroundWidth}
              height={dimensions.height}
              fill="#1E2130"
              opacity={0.9} 
            />
            
            {/* Progressive mask that covers the background (for left-to-right reveal) */}
            {progressiveMaskWidth > 0 && (
              <rect
                x={dividerLineX + darkBackgroundWidth - progressiveMaskWidth}
                y={0}
                width={progressiveMaskWidth}
                height={dimensions.height}
                fill={backgroundColor || "#000000"} 
                opacity={1}
              />
            )}
          </>
        )}
        
        <g transform={`translate(${dimensions.margin.left || 0},${dimensions.margin.top || 0})`}>
          {/* Price section */}
          <g transform={`translate(0, 0)`}>
            {/* SMA lines for main data */}
            {(showSMA || forceShowSMA) && chartType !== 'monthly' && chartType !== 'M' && chartType !== 'minute' && (
              <>
                {/* SMA10 line - make sure it works for hourly charts too */}
                {sma10Line && (hasSMA10 || chartType === 'hourly' || chartType === 'H') && (
                  <path
                    d={(() => {
                      try {
                        const pathData = sma10Line(stockData);
                        return pathData || "";
                      } catch (error) {
                        console.error("Error generating SMA10 path:", error);
                        return "";
                      }
                    })()}
                    fill="none"
                    stroke={CHART_CONFIG.COLORS.SMA10}
                    strokeWidth={CHART_CONFIG.SMA_LINE_WIDTH}
                    strokeOpacity={CHART_CONFIG.SMA_LINE_OPACITY}
                  />
                )}
                
                {/* SMA20 line - make sure it works for hourly charts too */}
                {sma20Line && (hasSMA20 || chartType === 'hourly' || chartType === 'H') && (
                  <path
                    d={(() => {
                      try {
                        const pathData = sma20Line(stockData);
                        return pathData || "";
                      } catch (error) {
                        console.error("Error generating SMA20 path:", error);
                        return "";
                      }
                    })()}
                    fill="none"
                    stroke={CHART_CONFIG.COLORS.SMA20}
                    strokeWidth={CHART_CONFIG.SMA_LINE_WIDTH}
                    strokeOpacity={CHART_CONFIG.SMA_LINE_OPACITY}
                  />
                )}
                
                {/* SMA50 line - only for non-hourly charts */}
                {sma50Line && hasSMA50 && chartType !== 'hourly' && chartType !== 'H' && (
                  <path
                    d={(() => {
                      try {
                        const pathData = sma50Line(stockData);
                        return pathData || "";
                      } catch (error) {
                        console.error("Error generating SMA50 path:", error);
                        return "";
                      }
                    })()}
                    fill="none"
                    stroke={CHART_CONFIG.COLORS.SMA50}
                    strokeWidth={CHART_CONFIG.SMA_LINE_WIDTH}
                    strokeOpacity={CHART_CONFIG.SMA_LINE_OPACITY}
                  />
                )}
                
                {/* Fallback for hourly chart type */}
                {chartType === 'hourly' && !(hasSMA10 || hasSMA20) && (
                  <text x="10" y="20" fill="white" fontSize="12">
                    SMA indicators not available for hourly data
                  </text>
                )}
                
                {/* SMA lines for after data - only show if after data is visible and zoomed out */}
                {scales.isZoomedOut && (showAfterAnimation || afterAnimationComplete) && visibleAfterData.length > 0 && chartType !== 'monthly' && chartType !== 'M' && chartType !== 'minute' && (
                  <>
                    {afterSma10Line && (hasSMA10 || chartType === 'hourly') && (
                      <path
                        d={(() => {
                          try {
                            const pathData = afterSma10Line(visibleAfterData);
                            return pathData || "";
                          } catch (error) {
                            console.error("Error generating after SMA10 path:", error);
                            return "";
                          }
                        })()}
                        fill="none"
                        stroke={CHART_CONFIG.COLORS.SMA10}
                        strokeWidth={CHART_CONFIG.SMA_LINE_WIDTH}
                        strokeOpacity={CHART_CONFIG.SMA_LINE_OPACITY}
                      />
                    )}
                    {afterSma20Line && (hasSMA20 || chartType === 'hourly') && (
                      <path
                        d={(() => {
                          try {
                            const pathData = afterSma20Line(visibleAfterData);
                            return pathData || "";
                          } catch (error) {
                            console.error("Error generating after SMA20 path:", error);
                            return "";
                          }
                        })()}
                        fill="none"
                        stroke={CHART_CONFIG.COLORS.SMA20}
                        strokeWidth={CHART_CONFIG.SMA_LINE_WIDTH}
                        strokeOpacity={CHART_CONFIG.SMA_LINE_OPACITY}
                      />
                    )}
                    {afterSma50Line && hasSMA50 && chartType !== 'hourly' && chartType !== 'H' && (
                      <path
                        d={(() => {
                          try {
                            const pathData = afterSma50Line(visibleAfterData);
                            return pathData || "";
                          } catch (error) {
                            console.error("Error generating after SMA50 path:", error);
                            return "";
                          }
                        })()}
                        fill="none"
                        stroke={CHART_CONFIG.COLORS.SMA50}
                        strokeWidth={CHART_CONFIG.SMA_LINE_WIDTH}
                        strokeOpacity={CHART_CONFIG.SMA_LINE_OPACITY}
                      />
                    )}
                  </>
                )}
              </>
            )}
            
            {/* Candlesticks for main data */}
            {candlesticks && candlesticks.length > 0 ? (
              <>
            {candlesticks.map((candle: CandlestickData, i: number) => (
              <g key={`main-${i}`}>
                  <line
                    x1={candle.x}
                    y1={candle.highY}
                    x2={candle.x}
                    y2={candle.lowY}
                    stroke={candle.isUp ? CHART_CONFIG.COLORS.UP : CHART_CONFIG.COLORS.DOWN}
                    strokeWidth={1}
                  />
                  <rect
                    x={candle.x - candle.width / 2}
                    y={Math.min(candle.openY, candle.closeY)}
                    width={candle.width}
                      height={Math.max(1, Math.abs(candle.closeY - candle.openY))} 
                    fill={candle.isUp ? CHART_CONFIG.COLORS.UP : CHART_CONFIG.COLORS.DOWN}
                    stroke={candle.isUp ? CHART_CONFIG.COLORS.UP : CHART_CONFIG.COLORS.DOWN}
                    strokeWidth={1}
                  />
              </g>
            ))}
              </>
            ) : (
              <text x="10" y="50" fill="white" fontSize="12">
                No candlesticks to render ({stockData.length} data points available)
              </text>
            )}
            
            {/* Candlesticks for after data - only show when zoomed out */}
            {scales.isZoomedOut && showAfterAnimation && afterCandlesticks && afterCandlesticks.map((candle: CandlestickData, i: number) => (
              <g key={`after-${i}`}>
                {!isNaN(candle.x) && !isNaN(candle.highY) && !isNaN(candle.lowY) && (
                  <line
                    x1={candle.x}
                    y1={candle.highY}
                    x2={candle.x}
                    y2={candle.lowY}
                    stroke={candle.isUp ? CHART_CONFIG.COLORS.UP : CHART_CONFIG.COLORS.DOWN}
                    strokeWidth={1}
                  />
                )}
                {!isNaN(candle.x) && !isNaN(candle.openY) && !isNaN(candle.closeY) && (
                  <rect
                    x={candle.x - candle.width / 2}
                    y={Math.min(candle.openY, candle.closeY)}
                    width={candle.width}
                    height={Math.abs(candle.closeY - candle.openY)}
                    fill={candle.isUp ? CHART_CONFIG.COLORS.UP : CHART_CONFIG.COLORS.DOWN}
                    stroke={candle.isUp ? CHART_CONFIG.COLORS.UP : CHART_CONFIG.COLORS.DOWN}
                    strokeWidth={1}
                  />
                )}
              </g>
            ))}

            {/* User selection marker - only show if selection is after last data point */}
            {userSelection && scales && (() => {
              const lastDataIndex = stockData.length - 1;
              const isFutureSelection = userSelection.x > lastDataIndex;
              
              if (!isFutureSelection) return null;
              
              // Calculate position for future selection (extrapolate from last data point)
              const lastDataXPos = scales.xScale(lastDataIndex);
              if (lastDataXPos === undefined) return null;
              const step = scales.xScale.step();
              const stepsBeyond = userSelection.x - lastDataIndex - 1;
              const futureXPos = lastDataXPos + (stepsBeyond + 1) * step;
              const yPos = scales.priceScale(userSelection.y) + dimensions.margin.top;
              
              return (
                <g>
                  {/* Clean, professional marker */}
                  <circle
                    cx={futureXPos + dimensions.margin.left}
                    cy={yPos}
                    r="4"
                    fill="#FFD700"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    opacity="0.95"
                  />
                </g>
              );
            })()}

            {/* Target point marker (correct answer) - only show after user selection and if both are in future */}
            {targetPoint && scales && userSelection && (() => {
              const lastDataIndex = stockData.length - 1;
              const isUserSelectionFuture = userSelection.x > lastDataIndex;
              const isTargetFuture = targetPoint.x > lastDataIndex;
              
              // Only show if both user selection and target are in future area
              if (!isUserSelectionFuture || !isTargetFuture) return null;
              
              // Calculate positions for future selections (extrapolate from last data point)
              const lastDataXPos = scales.xScale(lastDataIndex);
              if (lastDataXPos === undefined) return null;
              const step = scales.xScale.step();
              
              const userStepsBeyond = userSelection.x - lastDataIndex - 1;
              const userFutureXPos = lastDataXPos + (userStepsBeyond + 1) * step;
              
              const targetStepsBeyond = targetPoint.x - lastDataIndex - 1;
              const targetFutureXPos = lastDataXPos + (targetStepsBeyond + 1) * step;
              const targetYPos = scales.priceScale(targetPoint.y) + dimensions.margin.top;
              
              return (
                <g>
                  {/* Clean, professional marker */}
                  <circle
                    cx={targetFutureXPos + dimensions.margin.left}
                    cy={targetYPos}
                    r="4"
                    fill="#10B981"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    opacity="0.95"
                  />
                  {/* Subtle connecting line */}
                  <line
                    x1={userFutureXPos + dimensions.margin.left}
                    y1={scales.priceScale(userSelection.y) + dimensions.margin.top}
                    x2={targetFutureXPos + dimensions.margin.left}
                    y2={targetYPos}
                    stroke="#666666"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                    opacity="0.4"
                  />
                </g>
              );
            })()}
            
            {/* Visual divider line between historical data and future selection area */}
            {onChartClick && !disabled && scales && stockData.length > 0 && (() => {
              // Fixed position: divider stays in same screen position
              // Mobile: lower percentage to give more space for selection
              // Desktop: slightly higher but still leaves good selection area
              const SEPARATOR_POSITION_PERCENT = isMobile ? 0.70 : 0.75; // Mobile: 70%, Desktop: 75%
              const dividerX = dimensions.margin.left + (dimensions.innerWidth * SEPARATOR_POSITION_PERCENT);
              
              return (
                <g>
                  <line
                    x1={dividerX}
                    y1={0}
                    x2={dividerX}
                    y2={dimensions.height}
                    stroke="#ffffff"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                    opacity="0.3"
                  />
                  <rect
                    x={dividerX}
                    y={0}
                    width={dimensions.width - dividerX}
                    height={dimensions.height}
                    fill="rgba(255, 255, 255, 0.02)"
                    pointerEvents="none"
                  />
                </g>
              );
            })()}
          </g>

          {/* Volume section - hidden for previous charts */}
          {chartType !== 'previous' && (
            <g transform={`translate(0, ${scales.priceHeight})`}>
              {/* Volume bars for main data */}
              {volumeBars && volumeBars.length > 0 ? (
                <>
                  {volumeBars.map((bar: VolumeBarData, i: number) => (
                    <rect
                      key={`vol-${i}`}
                      x={bar.x}
                      y={bar.y}
                      width={bar.width}
                      height={bar.height}
                      fill={CHART_CONFIG.COLORS.VOLUME}
                      opacity={backgroundColor ? 0.6 : 0.3}
                    />
                  ))}
                </>
              ) : (
                <text x="10" y={scales.priceHeight + 20} fill="white" fontSize="12">
                  No volume bars to render
                </text>
              )}
              
              {/* Volume bars for after data - only show when zoomed out */}
              {scales.isZoomedOut && showAfterAnimation && afterVolumeBars && afterVolumeBars.map((bar: VolumeBarData, i: number) => (
                <rect
                  key={`after-vol-${i}`}
                  x={bar.x}
                  y={bar.y}
                  width={bar.width}
                  height={bar.height}
                  fill={CHART_CONFIG.COLORS.VOLUME}
                  opacity={0.5}
                />
              ))}
            </g>
          )}
        </g>
        
        {/* Progress indicator */}
        {progressIndicator}
      </svg>
    </div>
  );

}, (prevProps: StockChartProps, nextProps: StockChartProps): boolean => {
  // Custom comparison function for memoization to prevent unnecessary rerenders
  return (
    prevProps.data === nextProps.data &&
    prevProps.csvData === nextProps.csvData &&
    prevProps.afterData === nextProps.afterData &&
    prevProps.showSMA === nextProps.showSMA &&
    prevProps.includeAuth === nextProps.includeAuth &&
    prevProps.chartType === nextProps.chartType &&
    prevProps.height === nextProps.height &&
    prevProps.backgroundColor === nextProps.backgroundColor &&
    prevProps.showAfterAnimation === nextProps.showAfterAnimation &&
    prevProps.progressPercentage === nextProps.progressPercentage &&
    prevProps.zoomPercentage === nextProps.zoomPercentage &&
    prevProps.isInDelayPhase === nextProps.isInDelayPhase &&
    prevProps.afterAnimationComplete === nextProps.afterAnimationComplete &&
    prevProps.forceShowSMA === nextProps.forceShowSMA &&
    prevProps.tightPadding === nextProps.tightPadding
  );
});

export default StockChart;

export { getChartConfig } from "./config";
export { calculateSMA, processChartData } from "./utils/calculations";


