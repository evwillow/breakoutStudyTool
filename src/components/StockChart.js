/**
 * StockChart.js
 * 
 * Component for rendering interactive stock price charts.
 * Features:
 * - Responsive design that adapts to different screen sizes
 * - Renders price and volume data from JSON input
 * - Displays moving averages (SMA)
 * - Supports different color schemes for up/down movements
 * - Optimized rendering with canvas for performance
 */
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { scaleLinear, scalePoint } from "d3-scale";
import { line } from "d3-shape";
import AuthButtons from "./AuthButtons";
import AuthModal from "./AuthModal";

/**
 * Chart configuration with responsive settings
 * Adjusts dimensions, padding, and visual elements based on screen size
 */
const getChartConfig = (isMobile, chartType = 'default') => {
  // Base configuration
  const config = {
    PRICE_HEIGHT: 500, // Height of price chart area
    VOLUME_HEIGHT: 100, // Height of volume chart area
    PADDING: { 
      left: isMobile ? 40 : 60, 
      right: isMobile ? 10 : 20, 
      top: isMobile ? 10 : 20, 
      bottom: isMobile ? 20 : 30 
    },
    BAR_WIDTH: isMobile ? 4 : 6,
    BAR_PADDING: isMobile ? 1 : 2,
    PRICE_TICKS: isMobile ? 5 : 8,
    COLORS: {
      UP: "#00C853",     // Standard green for price increases
      DOWN: "#FF1744",   // Standard red for price decreases
      VOLUME: "#29B6F6", // Blue for volume bars
      GRID: "#1a1a1a",   // Dark gray for grid lines
      SMA10: "#FF6B6B",  // Bright red for 10-period moving average
      SMA20: "#4ECDC4",  // Teal for 20-period moving average
      SMA50: "#FFD166",  // Amber yellow for 50-period moving average
      TEXT: "#ffffff",   // White text for labels
    },
    SMA_LINE_WIDTH: isMobile ? 1.5 : 2,
    SMA_LINE_OPACITY: 0.9,
    BACKGROUND: "#000000", // Default black background
  };
  
  // Special color scheme for "after" chart type
  if (chartType === 'after') {
    config.COLORS = {
      ...config.COLORS,
      UP: "#00C853",     // Standard green for after chart
      DOWN: "#FF1744",   // Standard red for after chart
      VOLUME: "#42A5F5", // Darker blue for after chart
      SMA10: "#FF6B6B",  // Keep consistent with main chart
      SMA20: "#4ECDC4",  // Keep consistent with main chart
      SMA50: "#FFD166",  // Keep consistent with main chart
      GRID: "#444444",   // Darker grid lines for better visibility on transparent background
      TEXT: "#ffffff",   // White text for labels
    };
    config.BACKGROUND = "transparent"; // Transparent background for after chart
  }
  
  // Special color scheme for hourly chart
  if (chartType === 'hourly') {
    config.COLORS = {
      ...config.COLORS,
      SMA10: "#FF9500",  // Bright orange for hourly 10-period moving average
      SMA20: "#00BFA5",  // Vibrant teal for hourly 20-period moving average
      SMA50: "#FFEB3B",  // Bright yellow for hourly 50-period moving average
    };
    config.SMA_LINE_WIDTH = isMobile ? 1.5 : 2.5;
    config.SMA_LINE_OPACITY = 0.95;
  }
  
  // Special adjustments for small screens/charts
  if (isMobile) {
    // Make SMAs slightly more visible on small screens
    config.SMA_LINE_WIDTH = 1.5;
    config.SMA_LINE_OPACITY = 0.95;
  }
  
  return config;
};

// Memoized chart config for better performance
const MemoizedChartConfig = React.memo(
  ({ isMobile, chartType }) => getChartConfig(isMobile, chartType), 
  (prevProps, nextProps) => 
    prevProps.isMobile === nextProps.isMobile && 
    prevProps.chartType === nextProps.chartType
);

/**
 * Process chart data function - extracted for memoization
 */
const processChartData = (chartData, chartType) => {
  try {
    // The data is already parsed JSON from the API
    const jsonData = chartData;
    if (!Array.isArray(jsonData)) {
      console.warn("Data is not an array");
      return { data: [], hasSMA10: false, hasSMA20: false, hasSMA50: false };
    }
    
    // Check if this is the exact data format from the example
    let hasSMA10 = false;
    let hasSMA20 = false;
    let hasSMA50 = false;
    
    if (jsonData.length > 0) {
      const firstItem = jsonData[0];
      
      // Direct property access for the exact structure provided
      if (firstItem && typeof firstItem === 'object') {
        // Check for SMAs in both property formats (10sma and sma10)
        hasSMA10 = (firstItem.hasOwnProperty('10sma') && !isNaN(parseFloat(firstItem['10sma']))) ||
                  (firstItem.hasOwnProperty('sma10') && !isNaN(parseFloat(firstItem['sma10'])));
        
        hasSMA20 = (firstItem.hasOwnProperty('20sma') && !isNaN(parseFloat(firstItem['20sma']))) ||
                  (firstItem.hasOwnProperty('sma20') && !isNaN(parseFloat(firstItem['sma20'])));
        
        hasSMA50 = (firstItem.hasOwnProperty('50sma') && !isNaN(parseFloat(firstItem['50sma']))) ||
                  (firstItem.hasOwnProperty('sma50') && !isNaN(parseFloat(firstItem['sma50'])));
      }
    }
    
    // For hourly charts, always set SMAs to true
    if (chartType === 'hourly') {
      hasSMA10 = true;
      hasSMA20 = true;
      hasSMA50 = true;
    }
    
    return {
      data: jsonData.map(item => {
        // Parse numeric values
        const open = parseFloat(item.Open);
        const high = parseFloat(item.High);
        const low = parseFloat(item.Low);
        const close = parseFloat(item.Close);
        const volume = parseFloat(item.Volume);
        
        // Parse SMAs from both property formats
        let sma10 = null;
        let sma20 = null;
        let sma50 = null;
        
        // Try both property formats for each SMA
        if (item.hasOwnProperty('10sma')) {
          sma10 = parseFloat(item['10sma']);
        } else if (item.hasOwnProperty('sma10')) {
          sma10 = parseFloat(item['sma10']);
        }
        
        if (item.hasOwnProperty('20sma')) {
          sma20 = parseFloat(item['20sma']);
        } else if (item.hasOwnProperty('sma20')) {
          sma20 = parseFloat(item['sma20']);
        }
        
        if (item.hasOwnProperty('50sma')) {
          sma50 = parseFloat(item['50sma']);
        } else if (item.hasOwnProperty('sma50')) {
          sma50 = parseFloat(item['sma50']);
        }
        
        // Only include valid data points
        if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close) || isNaN(volume)) {
          return null;
        }
        
        // Store SMAs in both property formats for compatibility
        const result = {
          open,
          high,
          low,
          close,
          volume,
          sma10: !isNaN(sma10) ? sma10 : null,
          sma20: !isNaN(sma20) ? sma20 : null,
          sma50: !isNaN(sma50) ? sma50 : null
        };
        
        // Also store in the alternative format for compatibility
        if (!isNaN(sma10)) result['10sma'] = sma10;
        if (!isNaN(sma20)) result['20sma'] = sma20;
        if (!isNaN(sma50)) result['50sma'] = sma50;
        
        return result;
      }).filter(Boolean),
      hasSMA10,
      hasSMA20,
      hasSMA50
    };
  } catch (error) {
    console.error("Error processing chart data:", error);
    return { data: [], hasSMA10: false, hasSMA20: false, hasSMA50: false };
  }
};

/**
 * StockChart component renders price and volume data with optional moving averages
 */
const StockChart = React.memo(({ 
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
  forceShowSMA = false
}) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dimensions, setDimensions] = useState(null);
  const containerRef = useRef(null);
  
  // Use either data or csvData prop
  const chartData = data || csvData;
  
  // Handle container resize with debounce for performance
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight || 400;
        const isMobileView = window.innerWidth < 768;
        
        setIsMobile(isMobileView);
        
        const margin = { 
          top: isMobileView ? 10 : 15, 
          right: isMobileView ? 10 : 15, 
          bottom: isMobileView ? 10 : 15, 
          left: isMobileView ? 10 : 15 // Match all margins
        };
        
        const innerWidth = containerWidth - margin.left - margin.right;
        const innerHeight = containerHeight - margin.top - margin.bottom;
        
        setDimensions({
          width: containerWidth,
          height: containerHeight,
          margin,
          innerWidth,
          innerHeight
        });
      }
    };

    // Create ResizeObserver with debounced handler
    let timeoutId;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateDimensions, 150);
    };

    // Initial dimensions
    updateDimensions();

    // Create resize observer with debounced handler
    const resizeObserver = new ResizeObserver(debouncedResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, []);
  
  // Get responsive chart configuration
  const CHART_CONFIG = useMemo(() => getChartConfig(isMobile, chartType), [isMobile, chartType]);

  if (!chartData) {
    return (
      <div className="h-40 sm:h-60 flex items-center justify-center bg-black text-white text-sm sm:text-base">
        Loading chart data...
      </div>
    );
  }

  // Parse JSON data into an array of stock objects - memoized for performance
  const stockData = useMemo(() => processChartData(chartData, chartType), [chartData, chartType]);
  const afterStockData = useMemo(() => 
    afterData ? processChartData(afterData, chartType) : { data: [], hasSMA10: false, hasSMA20: false, hasSMA50: false }
  , [afterData, chartType]);

  // Memoize visible after data calculation
  const visibleAfterData = useMemo(() => {
    if (!afterStockData.data.length) return [];
    
    // Calculate how many bars to show based on progress percentage
    const totalAfterBars = afterStockData.data.length;
    const visibleBars = Math.floor(totalAfterBars * (progressPercentage / 100));
    
    // Return the visible portion of after data
    return afterStockData.data.slice(0, visibleBars);
  }, [afterStockData.data, progressPercentage]);

  // Determine if we should be zooming based on animation state
  const shouldZoom = useMemo(() => 
    afterStockData.data.length > 0 && zoomPercentage > 0
  , [afterStockData, zoomPercentage]);

  // Determine if we should show the background based on zoom progress
  const shouldShowBackground = zoomPercentage > 5; // Only show after zoom has started

  // Calculate scales with zoom out for combined data view
  const scales = useMemo(() => {
    if (!dimensions || !stockData.data.length) return null;

    // Log the first data point in hourly mode
    if (chartType === 'hourly') {
      console.log("First data point for hourly with SMAs:", stockData.data[0]);
    }

    // Get initial min/max for main data only
    const mainValues = stockData.data.flatMap(d => [
      d.high,
      d.low,
      d.close,
      ...(stockData.hasSMA10 ? [d.sma10] : []),
      ...(stockData.hasSMA20 ? [d.sma20] : []),
      ...(stockData.hasSMA50 ? [d.sma50] : [])
    ].filter(v => v !== null && !isNaN(v)));

    const mainMin = Math.min(...mainValues);
    const mainMax = Math.max(...mainValues);

    // Get min/max for after data
    let afterMin = mainMin;
    let afterMax = mainMax;

    if (afterStockData.data.length > 0) {
      const afterValues = afterStockData.data.flatMap(d => [
        d.high,
        d.low,
        d.close,
        ...(afterStockData.hasSMA10 ? [d.sma10] : []),
        ...(afterStockData.hasSMA20 ? [d.sma20] : []),
        ...(afterStockData.hasSMA50 ? [d.sma50] : [])
      ].filter(v => v !== null && !isNaN(v)));
      
      if (afterValues.length > 0) {
        afterMin = Math.min(...afterValues);
        afterMax = Math.max(...afterValues);
      }
    }

    // Create more natural zoom effect by applying easing to the zoom factor
    const rawZoomFactor = (shouldZoom === true) ? zoomPercentage / 100 : 0;

    // Apply additional easing to make zoom feel more natural
    // This creates a smoother "camera movement" effect
    const easeZoom = (t) => {
      // Use a single smooth easing function instead of a piecewise one
      // This avoids the weird "jump" that can happen at t=0.5
      return 1 - Math.pow(1 - t, 3); // Cubic ease-out for smooth deceleration
    };

    const zoomFactor = easeZoom(rawZoomFactor);

    // Ensure synchronized vertical and horizontal zoom
    // Base vertical range expansion on the same zoom factor
    const verticalZoomRatio = zoomFactor;
    
    // Calculate combined range with extra padding that increases as zoom progresses
    const combinedMin = Math.min(mainMin, afterMin);
    const combinedMax = Math.max(mainMax, afterMax);
    
    // Calculate middle point of price range to zoom outward from center
    const mainMidpoint = (mainMax + mainMin) / 2;
    
    // Calculate full range for zoomed out view with smooth scaling
    const fullRangeSize = (combinedMax - combinedMin) * (1.2 + (zoomFactor * 0.2)); // Gradually increase extra space
    
    // Apply zoom transformation with synchronized vertical/horizontal movement
    // This creates a "camera pulling back" effect from the center point in both directions
    const currentMin = mainMidpoint - ((fullRangeSize / 2) * verticalZoomRatio) - 
                        ((mainMidpoint - mainMin) * (1 - verticalZoomRatio));
    const currentMax = mainMidpoint + ((fullRangeSize / 2) * verticalZoomRatio) + 
                        ((mainMax - mainMidpoint) * (1 - verticalZoomRatio));

    // Add adaptive padding based on zoom progress
    const paddingFactor = 0.05 + (zoomFactor * 0.05); // Gradually increase padding
    const priceRange = currentMax - currentMin;
    const pricePadding = priceRange * paddingFactor;

    // Calculate volume range
    const volumeMax = Math.max(...stockData.data.map(d => d.volume));
    const volumePadding = volumeMax * 0.1;

    // Calculate heights for price and volume sections
    const totalHeight = dimensions.innerHeight;
    const volumeHeight = totalHeight * 0.2; // 20% of total height for volume
    const priceHeight = totalHeight - volumeHeight;

    // Create an array of indices for both original and after data
    // Gradually transition to full domain for smoother zoom
    const useFullDomain = zoomPercentage >= 40; // Lower threshold for smoother transition
    
    // Calculate the midpoint of the data for bidirectional zooming
    const totalDataPoints = stockData.data.length + (afterStockData.data.length > 0 ? afterStockData.data.length : 0);
    
    // Create indices for the full domain
    const fullIndices = [...Array(totalDataPoints).keys()];
    
    // For bidirectional zoom, we'll apply horizontal scaling around a transition point
    let combinedIndices;
    
    if (useFullDomain && afterStockData.data.length > 0) {
      // Show full domain when zoomed out enough
      combinedIndices = fullIndices;
    } else {
      // When zooming, focus around the boundary between main and after data
      const transitionPoint = stockData.data.length - 1;
      
      // Smoother calculation for better zoom effect
      const zoomRatio = Math.min(1, zoomFactor * 1.2); // Slightly accelerate the zoom
      
      // Use a consistent formula based on the original data length plus a portion of the after data
      // This creates a steadier expansion from the edge
      const visibleRange = stockData.data.length + (totalDataPoints - stockData.data.length) * zoomRatio;
      
      // Calculate which indices to include, with a gradually shifting center point
      // This prevents sudden jumps in the visible range
      const centerOffset = zoomRatio * 0.5; // Gradually shift center point as we zoom
      const centerPoint = transitionPoint + centerOffset;
      
      const startIdx = Math.max(0, Math.floor(centerPoint - (visibleRange * 0.5)));
      const endIdx = Math.min(totalDataPoints - 1, Math.ceil(centerPoint + (visibleRange * 0.5)));
      
      // Create array of visible indices
      combinedIndices = [...Array(endIdx - startIdx + 1).keys()].map(i => i + startIdx);
    }

    return {
      priceScale: scaleLinear()
        .domain([currentMin - pricePadding, currentMax + pricePadding])
        .range([priceHeight, 0]),
      volumeScale: scaleLinear()
        .domain([0, volumeMax + volumePadding])
        .range([volumeHeight, 0]),
      xScale: scalePoint()
        .domain(combinedIndices)
        .range([0, dimensions.innerWidth])
        .padding(0.5),
      priceHeight,
      volumeHeight,
      useFullDomain,
      zoomFactor
    };
  }, [dimensions, stockData, afterStockData, zoomPercentage, shouldZoom]);

  // Create line generators for SMA
  const sma10Line = useMemo(() => {
    if (!scales || !stockData.data.length) return null;
    
    return line()
      .x((d, i) => scales.xScale(i))
      .y(d => {
        // Check both sma10 and '10sma' properties
        const smaValue = d.sma10 !== null && !isNaN(d.sma10) 
          ? d.sma10 
          : (d['10sma'] !== undefined && !isNaN(parseFloat(d['10sma'])) ? parseFloat(d['10sma']) : null);
        
        if (smaValue !== null) {
          return scales.priceScale(smaValue);
        }
        return null;
      })
      .defined(d => (d.sma10 !== null && !isNaN(d.sma10)) || 
                   (d['10sma'] !== undefined && !isNaN(parseFloat(d['10sma']))));
  }, [scales, stockData.data]);
  
  const sma20Line = useMemo(() => {
    if (!scales || !stockData.data.length) return null;
    
    return line()
      .x((d, i) => scales.xScale(i))
      .y(d => {
        // Check both sma20 and '20sma' properties
        const smaValue = d.sma20 !== null && !isNaN(d.sma20) 
          ? d.sma20 
          : (d['20sma'] !== undefined && !isNaN(parseFloat(d['20sma'])) ? parseFloat(d['20sma']) : null);
        
        if (smaValue !== null) {
          return scales.priceScale(smaValue);
        }
        return null;
      })
      .defined(d => (d.sma20 !== null && !isNaN(d.sma20)) || 
                   (d['20sma'] !== undefined && !isNaN(parseFloat(d['20sma']))));
  }, [scales, stockData.data]);
  
  const sma50Line = useMemo(() => {
    if (!scales || !stockData.data.length) return null;
    
    return line()
      .x((d, i) => scales.xScale(i))
      .y(d => {
        // Check both sma50 and '50sma' properties
        const smaValue = d.sma50 !== null && !isNaN(d.sma50) 
          ? d.sma50 
          : (d['50sma'] !== undefined && !isNaN(parseFloat(d['50sma'])) ? parseFloat(d['50sma']) : null);
          
        if (smaValue !== null) {
          return scales.priceScale(smaValue);
        }
        return null;
      })
      .defined(d => (d.sma50 !== null && !isNaN(d.sma50)) || 
                   (d['50sma'] !== undefined && !isNaN(parseFloat(d['50sma']))));
  }, [scales, stockData.data]);

  // Create SMA line generators for after data
  const afterSma10Line = useMemo(() => {
    if (!scales || !afterStockData.data.length || !visibleAfterData.length) return null;
    
    return line()
      .x((d, i) => scales.xScale(stockData.data.length + i))
      .y(d => {
        // Check both sma10 and '10sma' properties
        const smaValue = d.sma10 !== null && !isNaN(d.sma10) 
          ? d.sma10 
          : (d['10sma'] !== undefined && !isNaN(parseFloat(d['10sma'])) ? parseFloat(d['10sma']) : null);
        
        if (smaValue !== null) {
          return scales.priceScale(smaValue);
        }
        return null;
      })
      .defined(d => (d.sma10 !== null && !isNaN(d.sma10)) || 
                   (d['10sma'] !== undefined && !isNaN(parseFloat(d['10sma']))));
  }, [scales, stockData.data.length, afterStockData.data, visibleAfterData]);
  
  const afterSma20Line = useMemo(() => {
    if (!scales || !afterStockData.data.length || !visibleAfterData.length) return null;
    
    return line()
      .x((d, i) => scales.xScale(stockData.data.length + i))
      .y(d => {
        // Check both sma20 and '20sma' properties
        const smaValue = d.sma20 !== null && !isNaN(d.sma20) 
          ? d.sma20 
          : (d['20sma'] !== undefined && !isNaN(parseFloat(d['20sma'])) ? parseFloat(d['20sma']) : null);
        
        if (smaValue !== null) {
          return scales.priceScale(smaValue);
        }
        return null;
      })
      .defined(d => (d.sma20 !== null && !isNaN(d.sma20)) || 
                   (d['20sma'] !== undefined && !isNaN(parseFloat(d['20sma']))));
  }, [scales, stockData.data.length, afterStockData.data, visibleAfterData]);
  
  const afterSma50Line = useMemo(() => {
    if (!scales || !afterStockData.data.length || !visibleAfterData.length) return null;
    
    return line()
      .x((d, i) => scales.xScale(stockData.data.length + i))
      .y(d => {
        // Check both sma50 and '50sma' properties
        const smaValue = d.sma50 !== null && !isNaN(d.sma50) 
          ? d.sma50 
          : (d['50sma'] !== undefined && !isNaN(parseFloat(d['50sma'])) ? parseFloat(d['50sma']) : null);
        
        if (smaValue !== null) {
          return scales.priceScale(smaValue);
        }
        return null;
      })
      .defined(d => (d.sma50 !== null && !isNaN(d.sma50)) || 
                   (d['50sma'] !== undefined && !isNaN(parseFloat(d['50sma']))));
  }, [scales, stockData.data.length, afterStockData.data, visibleAfterData]);

  // Create volume bars generator
  const volumeBars = useMemo(() => {
    if (!scales) return null;
    return stockData.data.map((d, i) => {
      const index = scales.xScale.domain().indexOf(i);
      // Skip if index is not in the domain (could happen during zoom transitions)
      if (index === -1) return null;
      
      const x = scales.xScale(i);
      const width = scales.xScale.step() * 0.8;
      const height = scales.volumeScale(d.volume);
      
      if (isNaN(x) || isNaN(height)) return null;
      
      return {
        x: x - width / 2,
        y: scales.volumeHeight - height, // Position at bottom of volume section
        width,
        height,
      };
    }).filter(Boolean); // Filter out null values
  }, [stockData.data, scales]);
  
  // Create volume bars for after data
  const afterVolumeBars = useMemo(() => {
    if (!scales || !visibleAfterData.length) return null;
    
    // Calculate offset based on original data length - must perfectly match the divider line calculation
    const offset = stockData.data.length;
    
    return visibleAfterData.map((d, i) => {
      const index = offset + i;
      // Skip if index is not in the domain
      if (!scales.xScale.domain().includes(index)) return null;
      
      const x = scales.xScale(index);
      // Use same width calculation as main data for consistency at the boundary
      const width = scales.xScale.step() * 0.8;
      const height = scales.volumeScale(d.volume);
      
      if (isNaN(x) || isNaN(height)) return null;
      
      return {
        x: x - width / 2,
        y: scales.volumeHeight - height,
        width,
        height,
      };
    }).filter(Boolean); // Filter out null values
  }, [visibleAfterData, stockData.data, scales]);

  // Create candlestick elements for main data
  const candlesticks = useMemo(() => {
    if (!scales) return null;
    
    // Use a constant width scale instead of an animation-dependent one
    // This prevents unwanted width changes during zoom animation
    const candleWidthScale = 0.85; // Fixed width scale for consistent appearance
    
    return stockData.data.map((d, i) => {
      // Skip processing if the candlestick won't be visible in the current domain
      // This improves performance and prevents visual artifacts
      if (!scales.xScale.domain().includes(i)) {
        return null;
      }
      
      const x = scales.xScale(i);
      const width = scales.xScale.step() * 0.8 * candleWidthScale;
      const openY = scales.priceScale(d.open);
      const closeY = scales.priceScale(d.close);
      const highY = scales.priceScale(d.high);
      const lowY = scales.priceScale(d.low);
      const isUp = d.close > d.open;
      
      // Verify that all calculated values are valid numbers
      if (isNaN(x) || isNaN(openY) || isNaN(closeY) || isNaN(highY) || isNaN(lowY)) {
        return null;
      }
      
      return {
        x,
        openY,
        closeY,
        highY,
        lowY,
        width,
        isUp,
      };
    }).filter(Boolean); // Filter out null values
  }, [stockData.data, scales]);

  // Create candlestick elements for after data with progressive reveal
  const afterCandlesticks = useMemo(() => {
    if (!scales || !visibleAfterData.length) return null;
    
    // Calculate offset based on original data length - this must match the divider line position exactly
    const offset = stockData.data.length;
    
    return visibleAfterData.map((d, i) => {
      const index = offset + i;
      // Skip if index is not in the domain
      if (!scales.xScale.domain().includes(index)) {
        return null;
      }
      
      const x = scales.xScale(index);
      // Use same width calculation as main data for consistency at the boundary
      const width = scales.xScale.step() * 0.8;
      const openY = scales.priceScale(d.open);
      const closeY = scales.priceScale(d.close);
      const highY = scales.priceScale(d.high);
      const lowY = scales.priceScale(d.low);
      const isUp = d.close > d.open;
      
      // Verify that all calculated values are valid numbers
      if (isNaN(x) || isNaN(openY) || isNaN(closeY) || isNaN(highY) || isNaN(lowY)) {
        return null;
      }
      
      return {
        x,
        openY,
        closeY,
        highY,
        lowY,
        width,
        isUp,
      };
    }).filter(Boolean); // Filter out null values
  }, [visibleAfterData, stockData.data, scales]);

  if (!dimensions || !scales || !stockData.data.length) {
    return (
      <div ref={containerRef} className="w-full h-full min-h-[400px]">
        <div className="h-full flex items-center justify-center bg-black text-white">
          Loading chart data...
        </div>
      </div>
    );
  }

  // Show a progress indicator during animation
  const progressIndicator = false; // Remove percentage display
  
  // Calculate the x position and width for the dark background
  // Get the exact x-coordinate of the last candle of the main data
  const mainDataEndX = scales.xScale(stockData.data.length - 1);
  
  // For precise alignment, we need the actual width of candlesticks
  // Used in the rendering to ensure consistent sizing
  const candlestickWidth = scales.xScale.step();
  const candleBarWidth = candlestickWidth * 0.8; // Width used in candlestick rendering
  
  // EXTREME FIX: Calculate the exact position for the vertical divider line
  // Get position of the last point in the main data
  const lastMainDataX = scales.xScale(stockData.data.length - 1);
  
  // Calculate the correct position for the divider line - EXACTLY at the split point
  // Position it precisely at the boundary between the last point of main data and first point of after data
  const dividerLineX = scales.xScale(stockData.data.length - 1) + scales.xScale.step();
  
  // Debug logs to verify exact positioning
  console.log("EXACT DIVIDER POSITIONING:", {
    lastMainDataX,
    firstAfterDataX: scales.xScale(stockData.data.length),
    step: scales.xScale.step(),
    finalDividerX: dividerLineX
  });
  
  // Set width to cover the entire area from the boundary to the end of the chart
  const darkBackgroundWidth = dimensions.width - dividerLineX;
  
  // Calculate progressive reveal mask position for the background
  const getProgressiveMaskWidth = () => {
    if (!showAfterAnimation || progressPercentage >= 100) return 0;
    
    // Calculate mask width based on progress percentage
    const fullWidth = darkBackgroundWidth;
    const visibleWidth = (progressPercentage / 100) * fullWidth;
    return fullWidth - visibleWidth;
  };

  const progressiveMaskWidth = getProgressiveMaskWidth();

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
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
        
        {/* SMA Legend */}
        {(showSMA || forceShowSMA) && (chartType === 'hourly' || stockData.hasSMA10 || stockData.hasSMA20 || stockData.hasSMA50) && (
          <g transform={`translate(${dimensions.margin.left + 10}, ${dimensions.margin.top + 10})`}>
            {/* 10 SMA */}
            {(chartType === 'hourly' || stockData.hasSMA10) && (
              <g transform="translate(0, 0)">
                <line x1="0" y1="0" x2="15" y2="0" stroke={CHART_CONFIG.COLORS.SMA10} strokeWidth="2" />
                <text x="20" y="4" fontSize="10" fill="#ffffff">10 SMA</text>
              </g>
            )}
            
            {/* 20 SMA */}
            {(chartType === 'hourly' || stockData.hasSMA20) && (
              <g transform="translate(0, 15)">
                <line x1="0" y1="0" x2="15" y2="0" stroke={CHART_CONFIG.COLORS.SMA20} strokeWidth="2" />
                <text x="20" y="4" fontSize="10" fill="#ffffff">20 SMA</text>
              </g>
            )}
            
            {/* 50 SMA */}
            {(chartType === 'hourly' || stockData.hasSMA50) && (
              <g transform="translate(0, 30)">
                <line x1="0" y1="0" x2="15" y2="0" stroke={CHART_CONFIG.COLORS.SMA50} strokeWidth="2" />
                <text x="20" y="4" fontSize="10" fill="#ffffff">50 SMA</text>
              </g>
            )}
          </g>
        )}
        
        {/* Dark background for after data area only - only applies to the main chart (D) */}
        {shouldShowBackground && !backgroundColor && (
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
        
        <g transform={`translate(${dimensions.margin.left},${dimensions.margin.top})`}>
          {/* Price section */}
          <g transform={`translate(0, 0)`}>
            {/* SMA lines for main data */}
            {(showSMA || forceShowSMA) && (
              <>
                {/* SMA lines for all chart types */}
                {sma10Line && (stockData.hasSMA10 || chartType === 'hourly') && (
                  <path
                    d={sma10Line(stockData.data)}
                    fill="none"
                    stroke={CHART_CONFIG.COLORS.SMA10}
                    strokeWidth={CHART_CONFIG.SMA_LINE_WIDTH}
                    strokeOpacity={CHART_CONFIG.SMA_LINE_OPACITY}
                  />
                )}
                
                {sma20Line && (stockData.hasSMA20 || chartType === 'hourly') && (
                  <path
                    d={sma20Line(stockData.data)}
                    fill="none"
                    stroke={CHART_CONFIG.COLORS.SMA20}
                    strokeWidth={CHART_CONFIG.SMA_LINE_WIDTH}
                    strokeOpacity={CHART_CONFIG.SMA_LINE_OPACITY}
                  />
                )}
                
                {sma50Line && (stockData.hasSMA50 || chartType === 'hourly') && (
                  <path
                    d={sma50Line(stockData.data)}
                    fill="none"
                    stroke={CHART_CONFIG.COLORS.SMA50}
                    strokeWidth={CHART_CONFIG.SMA_LINE_WIDTH}
                    strokeOpacity={CHART_CONFIG.SMA_LINE_OPACITY}
                  />
                )}
                
                {/* SMA lines for after data - only show if after data is visible */}
                {(showAfterAnimation || afterAnimationComplete) && visibleAfterData.length > 0 && (
                  <>
                    {afterSma10Line && (afterStockData.hasSMA10 || chartType === 'hourly') && (
                      <path
                        d={afterSma10Line(visibleAfterData)}
                        fill="none"
                        stroke={CHART_CONFIG.COLORS.SMA10}
                        strokeWidth={CHART_CONFIG.SMA_LINE_WIDTH}
                        strokeOpacity={CHART_CONFIG.SMA_LINE_OPACITY}
                      />
                    )}
                    {afterSma20Line && (afterStockData.hasSMA20 || chartType === 'hourly') && (
                      <path
                        d={afterSma20Line(visibleAfterData)}
                        fill="none"
                        stroke={CHART_CONFIG.COLORS.SMA20}
                        strokeWidth={CHART_CONFIG.SMA_LINE_WIDTH}
                        strokeOpacity={CHART_CONFIG.SMA_LINE_OPACITY}
                      />
                    )}
                    {afterSma50Line && (afterStockData.hasSMA50 || chartType === 'hourly') && (
                      <path
                        d={afterSma50Line(visibleAfterData)}
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
            {candlesticks.map((candle, i) => (
              <g key={`main-${i}`}>
                {!isNaN(candle.x) && !isNaN(candle.highY) && !isNaN(candle.lowY) && (
                  <line
                    x1={candle.x + candle.width / 2}
                    y1={candle.highY}
                    x2={candle.x + candle.width / 2}
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
            
            {/* Candlesticks for after data */}
            {showAfterAnimation && afterCandlesticks && afterCandlesticks.map((candle, i) => (
              <g key={`after-${i}`}>
                {!isNaN(candle.x) && !isNaN(candle.highY) && !isNaN(candle.lowY) && (
                  <line
                    x1={candle.x + candle.width / 2}
                    y1={candle.highY}
                    x2={candle.x + candle.width / 2}
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
          </g>

          {/* Volume section */}
          <g transform={`translate(0, ${scales.priceHeight})`}>
            {/* Volume bars for main data */}
            {volumeBars && volumeBars.map((bar, i) => (
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
            
            {/* Volume bars for after data */}
            {showAfterAnimation && afterVolumeBars && afterVolumeBars.map((bar, i) => (
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
        </g>
        
        {/* Progress indicator */}
        {progressIndicator}
      </svg>
    </div>
  );
}, (prevProps, nextProps) => {
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
    prevProps.forceShowSMA === nextProps.forceShowSMA
  );
});

// Function to calculate SMA values for a dataset
function calculateSMA(data, sma10Period = 10, sma20Period = 20, sma50Period = 50) {
  if (!data || data.length === 0) return data;

  // Make a deep copy to avoid modifying the original data
  const processedData = JSON.parse(JSON.stringify(data));
  
  console.log("Calculating SMAs for", processedData.length, "data points");
  
  // Calculate SMA10
  for (let i = 0; i < processedData.length; i++) {
    if (i >= sma10Period - 1) {
      let sum = 0;
      for (let j = 0; j < sma10Period; j++) {
        const closeValue = parseFloat(processedData[i - j].Close);
        if (!isNaN(closeValue)) {
          sum += closeValue;
        }
      }
      const sma10Value = sum / sma10Period;
      // Set both property formats for consistency
      processedData[i]["10sma"] = sma10Value;
      processedData[i].sma10 = sma10Value;
    } else {
      processedData[i]["10sma"] = null;
      processedData[i].sma10 = null;
    }
  }
  
  // Calculate SMA20
  for (let i = 0; i < processedData.length; i++) {
    if (i >= sma20Period - 1) {
      let sum = 0;
      for (let j = 0; j < sma20Period; j++) {
        const closeValue = parseFloat(processedData[i - j].Close);
        if (!isNaN(closeValue)) {
          sum += closeValue;
        }
      }
      const sma20Value = sum / sma20Period;
      // Set both property formats for consistency
      processedData[i]["20sma"] = sma20Value;
      processedData[i].sma20 = sma20Value;
    } else {
      processedData[i]["20sma"] = null;
      processedData[i].sma20 = null;
    }
  }
  
  // Calculate SMA50
  for (let i = 0; i < processedData.length; i++) {
    if (i >= sma50Period - 1) {
      let sum = 0;
      for (let j = 0; j < sma50Period; j++) {
        const closeValue = parseFloat(processedData[i - j].Close);
        if (!isNaN(closeValue)) {
          sum += closeValue;
        }
      }
      const sma50Value = sum / sma50Period;
      // Set both property formats for consistency
      processedData[i]["50sma"] = sma50Value;
      processedData[i].sma50 = sma50Value;
    } else {
      processedData[i]["50sma"] = null;
      processedData[i].sma50 = null;
    }
  }
  
  // For debugging
  console.log("SMA calculation complete");
  
  return processedData;
}

export default StockChart;