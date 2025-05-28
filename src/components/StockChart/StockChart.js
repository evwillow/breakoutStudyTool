"use client";

/**
 * StockChart Component
 * 
 * A comprehensive stock chart component that displays candlestick charts with volume,
 * moving averages, and interactive features for trading analysis.
 * 
 * Features:
 * - Candlestick chart with OHLC data
 * - Volume bars with color coding
 * - Multiple moving averages (SMA 10, 20, 50)
 * - Responsive design for mobile and desktop
 * - Optimized rendering with canvas for performance
 */
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { scaleLinear, scalePoint } from "d3-scale";
import { line } from "d3-shape";
import { AuthButtons, AuthModal } from "../Auth";

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
 * Calculate SMA for a given period - Completely rewritten for reliability
 * @param {Array} data - Array of price data objects
 * @param {number} period - SMA period (10, 20, 50, etc.)
 * @param {string} priceKey - The key to use for price (defaults to checking multiple possibilities)
 * @param {string} outputKey - The property name to use for the output (defaults to sma{period})
 * @returns {Array} - Array of data with SMA values added
 */
const calculateSMA = (data, period, priceKey = null, outputKey = null) => {
  console.log(`Starting SMA ${period} calculation for ${data.length} data points`);
  
  if (!Array.isArray(data) || data.length === 0) {
    console.warn("Cannot calculate SMA: Invalid or empty data array");
    return data;
  }
  
  if (period <= 0 || period >= data.length) {
    console.warn(`Cannot calculate SMA: Invalid period ${period} for data length ${data.length}`);
    return data;
  }
  
  // Determine the output property name to use
  const actualOutputKey = outputKey || `sma${period}`;
  
  // Create deep copy of data to avoid modifying original
  const result = data.map(item => ({...item}));
  
  // Helper function for flexible property access
  const getPrice = (item, props) => {
    for (const prop of props) {
      if (item[prop] !== undefined && item[prop] !== null) {
        const val = parseFloat(item[prop]);
        return isNaN(val) ? null : val;
      }
    }
    return null;
  };
  
  // Detect price key if not provided
  const firstItem = result[0];
  const possiblePriceKeys = ['close', 'Close', 'CLOSE', 'price', 'Price', 'PRICE', 'last', 'Last', 'LAST'];
  
  // Find which price key to use
  let actualPriceKey = priceKey;
  if (!actualPriceKey) {
    for (const key of possiblePriceKeys) {
      if (key in firstItem && firstItem[key] !== null && firstItem[key] !== undefined) {
        actualPriceKey = key;
        console.log(`Using ${key} for SMA calculation`);
        break;
      }
    }
  }
  
  if (!actualPriceKey) {
    console.error("No valid price key found in data");
    return data;
  }
  
  // Precalculate all numeric prices once (with validation)
  // Use flexible property access instead of relying on a specific property name
  const numericPrices = result.map(item => {
    const price = priceKey ? getPrice(item, [priceKey]) : getPrice(item, possiblePriceKeys);
    return price;
  });
  
  // Calculate SMA for each point
  for (let i = 0; i < result.length; i++) {
    // Not enough data points for calculation yet
    if (i < period - 1) {
      result[i][actualOutputKey] = null;
      continue;
    }
    
    // Sum the previous 'period' prices
    let sum = 0;
    let validPoints = 0;
    
    for (let j = 0; j < period; j++) {
      const price = numericPrices[i - j];
      if (price !== null && !isNaN(price)) {
        sum += price;
        validPoints++;
      }
    }
    
    // Only calculate SMA if we have at least 80% of valid data points
    if (validPoints >= period * 0.8) {
      const sma = sum / validPoints;
      result[i][actualOutputKey] = sma;
    } else {
      result[i][actualOutputKey] = null;
    }
  }
  
  // Debug output
  let validSMACount = 0;
  result.forEach(item => {
    if (item[actualOutputKey] !== null && !isNaN(item[actualOutputKey])) {
      validSMACount++;
    }
  });
  
  console.log(`SMA ${period} calculation complete (output as '${actualOutputKey}'): ${validSMACount} valid points out of ${data.length}`);
  if (validSMACount > 0) {
    // Use flexible property access here too
    console.log(`SMA ${period} examples:`, 
      result.filter(item => item[actualOutputKey] !== null)
        .slice(0, 3)
        .map(item => {
          const price = priceKey ? getPrice(item, [priceKey]) : getPrice(item, possiblePriceKeys);
          return {
            price: price,
            sma: item[actualOutputKey]
          };
        })
    );
  }
  
  return result;
};

/**
 * Process chart data function - extracted for memoization
 */
const processChartData = (chartData, chartType) => {
  if (!chartData || !Array.isArray(chartData) || chartData.length === 0) {
    console.warn('Invalid chart data:', chartData);
    return [];
  }

  console.log(`Processing ${chartData.length} data points for chart type: ${chartType}`);

  // Create a deep copy of the data to avoid modifying the original
  let processedData = chartData.map(item => ({...item}));

  // Special handling for hourly data - log more details
  if (chartType === 'hourly' || chartType === 'H') {
    console.log('HOURLY CHART DATA DEBUGGING:');
    // Check the first few data points to see if SMAs exist
    const samplePoints = processedData.slice(0, 3);
    console.log('First 3 data points:', JSON.stringify(samplePoints));
    
    // Check for SMA properties
    const firstPoint = samplePoints[0] || {};
    const hasSMA10 = 'sma10' in firstPoint || 'SMA10' in firstPoint || 'ma10' in firstPoint || 'MA10' in firstPoint || '10sma' in firstPoint;
    const hasSMA20 = 'sma20' in firstPoint || 'SMA20' in firstPoint || 'ma20' in firstPoint || 'MA20' in firstPoint || '20sma' in firstPoint;
    
    console.log('Hourly data SMA detection:', {
      hasSMA10,
      hasSMA20,
      sma10Value: firstPoint.sma10 || firstPoint.SMA10 || firstPoint.ma10 || firstPoint.MA10 || firstPoint['10sma'],
      sma20Value: firstPoint.sma20 || firstPoint.SMA20 || firstPoint.ma20 || firstPoint.MA20 || firstPoint['20sma']
    });
  }

  // Handle case where data might be in a JSON string
  processedData = processedData.map(item => {
    // Check if we're dealing with a JSON string in a 'json' property
    if (item.json && typeof item.json === 'string') {
      try {
        // Parse the JSON string
        const parsedJson = JSON.parse(item.json);
        console.log('Parsed JSON data:', parsedJson);
        // Merge the parsed JSON with the item
        return { ...item, ...parsedJson };
      } catch (err) {
        console.error('Error parsing JSON data:', err);
        return item;
      }
    }
    return item;
  });

  // Log structure of first data point
  const samplePoint = processedData[0];
  console.log('Raw data first point:', JSON.stringify(samplePoint));
  
  // Verify that OHLC properties exist
  const hasOpen = 'open' in samplePoint || 'Open' in samplePoint;
  const hasHigh = 'high' in samplePoint || 'High' in samplePoint;
  const hasLow = 'low' in samplePoint || 'Low' in samplePoint;
  const hasClose = 'close' in samplePoint || 'Close' in samplePoint;
  const hasVolume = 'volume' in samplePoint || 'Volume' in samplePoint;
  
  console.log('Data contains OHLCV properties:', {
    hasOpen,
    hasHigh,
    hasLow,
    hasClose,
    hasVolume
  });
  
  // Check if SMA data already exists in the JSON
  const hasSMA10Data = 'sma10' in samplePoint || 'SMA10' in samplePoint || 'ma10' in samplePoint || 'MA10' in samplePoint || '10sma' in samplePoint;
  const hasSMA20Data = 'sma20' in samplePoint || 'SMA20' in samplePoint || 'ma20' in samplePoint || 'MA20' in samplePoint || '20sma' in samplePoint;
  const hasSMA50Data = 'sma50' in samplePoint || 'SMA50' in samplePoint || 'ma50' in samplePoint || 'MA50' in samplePoint || '50sma' in samplePoint;
  
  console.log('SMA data in JSON:', {
    hasSMA10Data,
    hasSMA20Data,
    hasSMA50Data
  });
  
  // Ensure we have the right case for price and SMA properties - normalize them
  processedData = processedData.map(item => {
    // Create a standardized version with consistent property names
    const result = {...item};
    
    // Normalize OHLCV property names to lowercase
    if ('Open' in item && !('open' in item)) result.open = item.Open;
    if ('High' in item && !('high' in item)) result.high = item.High;
    if ('Low' in item && !('low' in item)) result.low = item.Low;
    if ('Close' in item && !('close' in item)) result.close = item.Close;
    if ('Volume' in item && !('volume' in item)) result.volume = item.Volume;
    
    // Normalize SMA property names to lowercase with expanded variants
    // Check multiple possible property names for SMAs
    if (!('sma10' in result)) {
      if ('SMA10' in item) result.sma10 = item.SMA10;
      else if ('ma10' in item) result.sma10 = item.ma10;
      else if ('MA10' in item) result.sma10 = item.MA10;
      else if ('ema10' in item) result.sma10 = item.ema10; // Sometimes EMA is used instead
      else if ('EMA10' in item) result.sma10 = item.EMA10;
      else if ('10sma' in item) result.sma10 = item['10sma']; // New format
      else if ('10SMA' in item) result.sma10 = item['10SMA']; // New format
    }
    
    if (!('sma20' in result)) {
      if ('SMA20' in item) result.sma20 = item.SMA20;
      else if ('ma20' in item) result.sma20 = item.ma20;
      else if ('MA20' in item) result.sma20 = item.MA20;
      else if ('ema20' in item) result.sma20 = item.ema20;
      else if ('EMA20' in item) result.sma20 = item.EMA20;
      else if ('20sma' in item) result.sma20 = item['20sma']; // New format
      else if ('20SMA' in item) result.sma20 = item['20SMA']; // New format
    }
    
    if (!('sma50' in result)) {
      if ('SMA50' in item) result.sma50 = item.SMA50;
      else if ('ma50' in item) result.sma50 = item.ma50;
      else if ('MA50' in item) result.sma50 = item.MA50;
      else if ('ema50' in item) result.sma50 = item.ema50;
      else if ('EMA50' in item) result.sma50 = item.EMA50;
      else if ('50sma' in item) result.sma50 = item['50sma']; // New format
      else if ('50SMA' in item) result.sma50 = item['50SMA']; // New format
    }
    
    return result;
  });
  
  // Log the number of data points
  console.log(`Processing ${processedData.length} data points`);
  
  // Check if SMAs exist in the data
  const hasSMA10 = processedData.some(d => d.sma10 !== null && d.sma10 !== undefined);
  const hasSMA20 = processedData.some(d => d.sma20 !== null && d.sma20 !== undefined);
  const hasSMA50 = processedData.some(d => d.sma50 !== null && d.sma50 !== undefined);
  
  console.log(`SMA data present: SMA10: ${hasSMA10}, SMA20: ${hasSMA20}, SMA50: ${hasSMA50}`);
  
  // Calculate SMAs if they don't exist in the data
  if (!hasSMA10 && (chartType !== 'monthly' && chartType !== 'M')) {
    console.log('Calculating SMA10 as it is not present in the data');
    calculateSMA(processedData, 10, 'close', 'sma10');
  }
  
  if (!hasSMA20 && (chartType !== 'monthly' && chartType !== 'M')) {
    console.log('Calculating SMA20 as it is not present in the data');
    calculateSMA(processedData, 20, 'close', 'sma20');
  }
  
  if (!hasSMA50 && (chartType !== 'monthly' && chartType !== 'M') && chartType !== 'hourly' && chartType !== 'H') {
    console.log('Calculating SMA50 as it is not present in the data');
    calculateSMA(processedData, 50, 'close', 'sma50');
  }
  
  // Control which SMAs to display for each chart type
  let showSMA10 = true;
  let showSMA20 = true;
  let showSMA50 = true;
  
  // Log chart type to help with debugging
  console.log(`Chart type detected: "${chartType}"`);
  
  // For hourly charts, only display SMA10 and SMA20
  if (chartType === 'hourly' || chartType === 'H') {
    showSMA10 = true;
    showSMA20 = true;
    showSMA50 = false; // Don't show SMA50 for hourly
    console.log(`Hourly chart detected - showing only SMA10 and SMA20`);
  }
  
  // For monthly charts, don't display any SMAs
  else if (chartType === 'monthly' || chartType === 'M' || chartType === 'minute') {
    showSMA10 = false;
    showSMA20 = false;
    showSMA50 = false;
    console.log(`${chartType} chart detected - not showing any SMAs as requested`);
  }
  else {
    console.log(`Using default SMA display settings: showing SMA10, SMA20, and SMA50`);
  }
  
  // Apply display settings - set SMAs to null if they shouldn't be shown
  processedData = processedData.map(item => {
    const result = {...item};
    
    // Apply display settings - set SMAs to null if they shouldn't be shown
    if (!showSMA10) result.sma10 = null;
    if (!showSMA20) result.sma20 = null;
    if (!showSMA50) result.sma50 = null;
    
    return result;
  });
  
  // Log the normalized first point with SMA data
  console.log('Normalized first point with SMA settings applied:', 
    JSON.stringify(processedData[0]));

  // Check how many data points have SMAs after processing
  const sma10Count = processedData.filter(d => d.sma10 !== null && d.sma10 !== undefined).length;
  const sma20Count = processedData.filter(d => d.sma20 !== null && d.sma20 !== undefined).length;
  const sma50Count = processedData.filter(d => d.sma50 !== null && d.sma50 !== undefined).length;
  
  console.log(`After processing: SMA10: ${sma10Count}, SMA20: ${sma20Count}, SMA50: ${sma50Count} valid points`);

  return processedData;
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
    afterData ? processChartData(afterData, chartType) : []
  , [afterData, chartType]);

  // Check if SMAs are available
  const hasSMA10 = stockData.some(item => item.sma10 !== null && item.sma10 !== undefined && !isNaN(item.sma10));
  const hasSMA20 = stockData.some(item => item.sma20 !== null && item.sma20 !== undefined && !isNaN(item.sma20));
  const hasSMA50 = stockData.some(item => item.sma50 !== null && item.sma50 !== undefined && !isNaN(item.sma50));

  // Memoize visible after data calculation
  const visibleAfterData = useMemo(() => {
    if (!afterStockData.length) return [];
    
    // Calculate how many bars to show based on progress percentage
    const totalAfterBars = afterStockData.length;
    const visibleBars = Math.floor(totalAfterBars * (progressPercentage / 100));
    
    // Return the visible portion of after data
    return afterStockData.slice(0, visibleBars);
  }, [afterStockData, progressPercentage]);

  // Determine if we should be zooming based on animation state
  const shouldZoom = useMemo(() => 
    afterStockData.length > 0 && zoomPercentage > 0
  , [afterStockData, zoomPercentage]);

  // Determine if we should show the background based on zoom progress
  const shouldShowBackground = zoomPercentage > 5; // Only show after zoom has started

  // Calculate scales with zoom out for combined data view
  const scales = useMemo(() => {
    if (!dimensions || !stockData.length) return null;

    // Log the first data point in hourly mode
    if (chartType === 'hourly') {
      console.log("First data point for hourly with SMAs:", stockData[0]);
    }

    // Debug SMA detection for chart scaling
    console.log("SMA status for chart scaling:", {
      hasSMA10: hasSMA10,
      hasSMA20: hasSMA20, 
      hasSMA50: hasSMA50,
      sampleSMA10: stockData[0]?.sma10,
      sampleSMA20: stockData[0]?.sma20,
      sampleSMA50: stockData[0]?.sma50
    });

    // Get initial min/max for main data only
    const mainValues = stockData.flatMap(d => {
      // Start with price values
      const values = [d.high, d.low, d.close];
      
      // Add SMA values if they exist
      if (hasSMA10 && d.sma10 !== null && !isNaN(d.sma10)) values.push(d.sma10);
      if (hasSMA20 && d.sma20 !== null && !isNaN(d.sma20)) values.push(d.sma20);
      if (hasSMA50 && d.sma50 !== null && !isNaN(d.sma50)) values.push(d.sma50);
      
      return values.filter(v => v !== null && !isNaN(v) && v > 0.001); // Filter out zero or extremely small values
    });

    // Ensure we have valid values
    if (mainValues.length === 0) {
      console.warn("No valid price values found in data");
      // Provide fallback values
      return null;
    }

    const mainMin = Math.min(...mainValues);
    const mainMax = Math.max(...mainValues);

    // Get min/max for after data
    let afterMin = mainMin;
    let afterMax = mainMax;

    if (afterStockData.length > 0) {
      const afterValues = afterStockData.flatMap(d => {
        // Start with price values
        const values = [d.high, d.low, d.close];
        
        // Add SMA values if they exist
        if (hasSMA10 && d.sma10 !== null && !isNaN(d.sma10)) values.push(d.sma10);
        if (hasSMA20 && d.sma20 !== null && !isNaN(d.sma20)) values.push(d.sma20);
        if (hasSMA50 && d.sma50 !== null && !isNaN(d.sma50)) values.push(d.sma50);
        
        return values.filter(v => v !== null && !isNaN(v) && v > 0.001); // Filter out zero or extremely small values
      });
      
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
    const volumeMax = Math.max(...stockData.map(d => d.volume));
    const volumePadding = volumeMax * 0.1;

    // Calculate heights for price and volume sections
    const totalHeight = dimensions.innerHeight;
    const volumeHeight = totalHeight * 0.2; // 20% of total height for volume
    const priceHeight = totalHeight - volumeHeight;

    // Create an array of indices for both original and after data
    // Gradually transition to full domain for smoother zoom
    const useFullDomain = zoomPercentage >= 40; // Lower threshold for smoother transition
    
    // Calculate the midpoint of the data for bidirectional zooming
    const totalDataPoints = stockData.length + (afterStockData.length > 0 ? afterStockData.length : 0);
    
    // Create indices for the full domain
    const fullIndices = [...Array(totalDataPoints).keys()];
    
    // For bidirectional zoom, we'll apply horizontal scaling around a transition point
    let combinedIndices;
    
    // FIXED: Always include all indices from the main stockData for proper rendering
    // This ensures candlesticks are always visible for the main data
    if (afterStockData.length === 0) {
      // If there's no after data, just use all indices from main data
      combinedIndices = [...Array(stockData.length).keys()];
    } else if (useFullDomain) {
      // Show full domain when zoomed out enough
      combinedIndices = fullIndices;
    } else {
      // When zooming, focus around the boundary between main and after data
      const transitionPoint = stockData.length - 1;
      
      // Smoother calculation for better zoom effect
      const zoomRatio = Math.min(1, zoomFactor * 1.2); // Slightly accelerate the zoom
      
      // Use a consistent formula based on the original data length plus a portion of the after data
      // This creates a steadier expansion from the edge
      const visibleRange = stockData.length + (totalDataPoints - stockData.length) * zoomRatio;
      
      // Calculate which indices to include, with a gradually shifting center point
      // This prevents sudden jumps in the visible range
      const centerOffset = zoomRatio * 0.5; // Gradually shift center point as we zoom
      const centerPoint = transitionPoint + centerOffset;
      
      const startIdx = Math.max(0, Math.floor(centerPoint - (visibleRange * 0.5)));
      const endIdx = Math.min(totalDataPoints - 1, Math.ceil(centerPoint + (visibleRange * 0.5)));
      
      // Create array of visible indices
      combinedIndices = [...Array(endIdx - startIdx + 1).keys()].map(i => i + startIdx);
      
      // FIXED: Ensure ALL indices from main data are included
      // This is critical to make sure candlesticks are rendered for the main chart
      if (startIdx > 0) {
        const mainIndices = [...Array(startIdx).keys()];
        combinedIndices = [...mainIndices, ...combinedIndices];
      }
    }

    // Get the last valid price for labels
    const lastValidDataPoint = stockData[stockData.length - 1];
    const lastPrice = lastValidDataPoint?.close || lastValidDataPoint?.Close;

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
      zoomFactor,
      lastPrice
    };
  }, [dimensions, stockData, afterStockData, zoomPercentage, shouldZoom, hasSMA10, hasSMA20, hasSMA50]);

  // Create line generators for SMA
  const sma10Line = useMemo(() => {
    if (!scales || !stockData.length) return null;
    
    // Special handling for hourly chart
    if (chartType === 'hourly' || chartType === 'H') {
      console.log('Attempting to create SMA10 line for hourly chart');
      console.log('SMA10 availability check:', stockData.filter(d => 
        d.sma10 !== null && d.sma10 !== undefined && !isNaN(d.sma10)
      ).length, 'out of', stockData.length);
    }
    
    // Check if we have valid SMA10 values to render
    const validSMA10Points = stockData.filter(d => 
      d.sma10 !== null && d.sma10 !== undefined && !isNaN(d.sma10)
    );
    
    console.log(`SMA10 line generation: ${validSMA10Points.length} valid points out of ${stockData.length} total points`);
    
    // If no valid points, don't try to create a line
    if (validSMA10Points.length === 0) {
      console.warn("No valid SMA10 points to render");
      return null;
    }
    
    // Rest of the function continues as before...

    return line()
      .x((d, i) => {
        // FIXED: Check if index is in domain and handle accordingly
        const isInDomain = scales.xScale.domain().includes(i);
        const xPos = isInDomain ? scales.xScale(i) : null;
        
        // If point isn't in the domain, it will be excluded from the path
        if (xPos === null) return null;
        
        // Debug occasional points
        if (i % 100 === 0) {
          console.log(`SMA10 x-position for point ${i}:`, xPos);
        }
        return xPos;
      })
      .y(d => {
        // Make sure we have a valid numeric value
        if (d.sma10 === null || d.sma10 === undefined || isNaN(d.sma10)) {
          return null; // This point will be skipped in the path
        }
        const yPos = scales.priceScale(d.sma10);
        return yPos;
      })
      // Only include points where sma10 is a valid number AND in the domain
      .defined((d, i) => {
        const hasValidValue = d.sma10 !== null && d.sma10 !== undefined && !isNaN(d.sma10);
        const isInDomain = scales.xScale.domain().includes(i);
        return hasValidValue && isInDomain;
      });
  }, [scales, stockData]);
  
  // Create line generators for SMA20 and SMA50 (similar to SMA10)
  const sma20Line = useMemo(() => {
    if (!scales || !stockData.length) return null;
    
    // Special handling for hourly chart
    if (chartType === 'hourly' || chartType === 'H') {
      console.log('Attempting to create SMA20 line for hourly chart');
      console.log('SMA20 availability check:', stockData.filter(d => 
        d.sma20 !== null && d.sma20 !== undefined && !isNaN(d.sma20)
      ).length, 'out of', stockData.length);
    }
    
    // Check if we have valid SMA20 values to render
    const validSMA20Points = stockData.filter(d => 
      d.sma20 !== null && d.sma20 !== undefined && !isNaN(d.sma20)
    );
    
    console.log(`SMA20 line generation: ${validSMA20Points.length} valid points out of ${stockData.length} total points`);
    
    // If no valid points, don't try to create a line
    if (validSMA20Points.length === 0) {
      console.warn("No valid SMA20 points to render");
      return null;
    }
    
    return line()
      .x((d, i) => {
        // FIXED: Check if index is in domain and handle accordingly
        const isInDomain = scales.xScale.domain().includes(i);
        const xPos = isInDomain ? scales.xScale(i) : null;
        return xPos;
      })
      .y(d => {
        // Make sure we have a valid numeric value
        if (d.sma20 === null || d.sma20 === undefined || isNaN(d.sma20)) {
          return null; // This point will be skipped in the path
        }
        return scales.priceScale(d.sma20);
      })
      // Only include points where sma20 is a valid number AND in the domain
      .defined((d, i) => {
        const hasValidValue = d.sma20 !== null && d.sma20 !== undefined && !isNaN(d.sma20);
        const isInDomain = scales.xScale.domain().includes(i);
        return hasValidValue && isInDomain;
      });
  }, [scales, stockData]);
  
  const sma50Line = useMemo(() => {
    if (!scales || !stockData.length) return null;
    
    // Check if we have valid SMA50 values to render
    const validSMA50Points = stockData.filter(d => 
      d.sma50 !== null && d.sma50 !== undefined && !isNaN(d.sma50)
    );
    
    console.log(`SMA50 line generation: ${validSMA50Points.length} valid points out of ${stockData.length} total points`);
    
    // If no valid points, don't try to create a line
    if (validSMA50Points.length === 0) {
      console.warn("No valid SMA50 points to render");
      return null;
    }
    
    return line()
      .x((d, i) => {
        // FIXED: Check if index is in domain and handle accordingly
        const isInDomain = scales.xScale.domain().includes(i);
        const xPos = isInDomain ? scales.xScale(i) : null;
        return xPos;
      })
      .y(d => {
        // Make sure we have a valid numeric value
        if (d.sma50 === null || d.sma50 === undefined || isNaN(d.sma50)) {
          return null; // This point will be skipped in the path
        }
        return scales.priceScale(d.sma50);
      })
      // Only include points where sma50 is a valid number AND in the domain
      .defined((d, i) => {
        const hasValidValue = d.sma50 !== null && d.sma50 !== undefined && !isNaN(d.sma50);
        const isInDomain = scales.xScale.domain().includes(i);
        return hasValidValue && isInDomain;
      });
  }, [scales, stockData]);

  // Create SMA line generators for after data
  const afterSma10Line = useMemo(() => {
    if (!scales || !afterStockData.length || !visibleAfterData.length) return null;
    
    return line()
      .x((d, i) => scales.xScale(stockData.length + i))
      .y(d => {
        // Make sure we have a valid numeric value
        if (d.sma10 === null || d.sma10 === undefined || isNaN(d.sma10)) {
          return null; // This point will be skipped in the path
        }
        return scales.priceScale(d.sma10);
      })
      // Only include points where sma10 is a valid number
      .defined(d => d.sma10 !== null && d.sma10 !== undefined && !isNaN(d.sma10));
  }, [scales, stockData.length, afterStockData, visibleAfterData]);
  
  const afterSma20Line = useMemo(() => {
    if (!scales || !afterStockData.length || !visibleAfterData.length) return null;
    
    return line()
      .x((d, i) => scales.xScale(stockData.length + i))
      .y(d => {
        // Make sure we have a valid numeric value
        if (d.sma20 === null || d.sma20 === undefined || isNaN(d.sma20)) {
          return null; // This point will be skipped in the path
        }
        return scales.priceScale(d.sma20);
      })
      // Only include points where sma20 is a valid number
      .defined(d => d.sma20 !== null && d.sma20 !== undefined && !isNaN(d.sma20));
  }, [scales, stockData.length, afterStockData, visibleAfterData]);
  
  const afterSma50Line = useMemo(() => {
    if (!scales || !afterStockData.length || !visibleAfterData.length) return null;
    
    return line()
      .x((d, i) => scales.xScale(stockData.length + i))
      .y(d => {
        // Make sure we have a valid numeric value
        if (d.sma50 === null || d.sma50 === undefined || isNaN(d.sma50)) {
          return null; // This point will be skipped in the path
        }
        return scales.priceScale(d.sma50);
      })
      // Only include points where sma50 is a valid number
      .defined(d => d.sma50 !== null && d.sma50 !== undefined && !isNaN(d.sma50));
  }, [scales, stockData.length, afterStockData, visibleAfterData]);

  // Create candlestick elements for main data
  const candlesticks = useMemo(() => {
    if (!scales || !stockData || stockData.length === 0) {
      console.log("Cannot generate candlesticks: missing scales or stock data");
      return [];
    }
    
    // Simple approach: generate candlesticks for ALL data points
    console.log(`Generating candlesticks for ${stockData.length} data points`);
    
    const result = stockData.map((d, i) => {
      // More flexible property access - check various property names
      const getPrice = (item, props) => {
        for (const prop of props) {
          if (item[prop] !== undefined && item[prop] !== null) {
            const val = parseFloat(item[prop]);
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
      
      // Debug data for a sample point
      if (i === 0) {
        console.log('First candlestick data point:', {
          raw: d,
          processed: { open, high, low, close }
        });
      }
      
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
        // Calculate position using scale
      const x = scales.xScale(i);
        // If x is undefined or NaN, use a simple fallback calculation
        const finalX = (x === undefined || isNaN(x)) 
          ? (i * (dimensions.innerWidth / stockData.length)) 
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
    }).filter(Boolean); // Remove any null entries
    
    console.log(`Generated ${result.length} valid candlesticks out of ${stockData.length} data points`);
    return result;
  }, [scales, stockData, dimensions]);
  
  // Create volume bars generator - simplified approach
  const volumeBars = useMemo(() => {
    if (!scales || !stockData || stockData.length === 0) {
      return [];
    }
    
    console.log(`Generating volume bars for ${stockData.length} data points`);
    
    const result = stockData.map((d, i) => {
      // More flexible property access for volume
      const getVolume = (item) => {
        for (const prop of ['volume', 'Volume', 'VOLUME']) {
          if (item[prop] !== undefined && item[prop] !== null) {
            const val = parseFloat(item[prop]);
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
        // Calculate position using scale
        const x = scales.xScale(i);
        // If x is undefined or NaN, use a simple fallback calculation
        const finalX = (x === undefined || isNaN(x)) 
          ? (i * (dimensions.innerWidth / stockData.length)) 
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
        console.error(`Error generating volume bar for index ${i}:`, err);
        return null;
      }
    }).filter(Boolean); // Remove any null entries
    
    console.log(`Generated ${result.length} valid volume bars out of ${stockData.length} data points`);
    return result;
  }, [scales, stockData, dimensions]);

  // Create candlestick elements for after data with progressive reveal
  const afterCandlesticks = useMemo(() => {
    if (!scales || !visibleAfterData || visibleAfterData.length === 0) {
      return [];
    }
    
    // Calculate offset based on original data length
    const offset = stockData.length;
    
    console.log(`Generating after candlesticks for ${visibleAfterData.length} data points`);
    
    const result = visibleAfterData.map((d, i) => {
      // More flexible property access - check various property names
      const getPrice = (item, props) => {
        for (const prop of props) {
          if (item[prop] !== undefined && item[prop] !== null) {
            const val = parseFloat(item[prop]);
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
        // Calculate position using scale
        const index = offset + i;
        const x = scales.xScale(index);
        // If x is undefined or NaN, use a simple fallback calculation
        const finalX = (x === undefined || isNaN(x)) 
          ? ((offset + i) * (dimensions.innerWidth / (stockData.length + visibleAfterData.length)))
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
    }).filter(Boolean); // Remove any null entries
    
    console.log(`Generated ${result.length} valid after candlesticks out of ${visibleAfterData.length} data points`);
    return result;
  }, [scales, stockData.length, visibleAfterData, dimensions]);

  // Create volume bars for after data with the same simplified approach
  const afterVolumeBars = useMemo(() => {
    if (!scales || !visibleAfterData || visibleAfterData.length === 0) {
      return [];
    }
    
    // Calculate offset based on original data length
    const offset = stockData.length;
    
    console.log(`Generating after volume bars for ${visibleAfterData.length} data points`);
    
    const result = visibleAfterData.map((d, i) => {
      // More flexible property access for volume
      const getVolume = (item) => {
        for (const prop of ['volume', 'Volume', 'VOLUME']) {
          if (item[prop] !== undefined && item[prop] !== null) {
            const val = parseFloat(item[prop]);
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
        // Calculate position using scale
        const index = offset + i;
      const x = scales.xScale(index);
        // If x is undefined or NaN, use a simple fallback calculation
        const finalX = (x === undefined || isNaN(x)) 
          ? ((offset + i) * (dimensions.innerWidth / (stockData.length + visibleAfterData.length))) 
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
    }).filter(Boolean); // Remove any null entries
    
    console.log(`Generated ${result.length} valid after volume bars out of ${visibleAfterData.length} data points`);
    return result;
  }, [scales, stockData.length, visibleAfterData, dimensions]);

  // Debugging before render
  useEffect(() => {
    // Only run in development and not too frequently
    if (process.env.NODE_ENV !== 'production' && stockData && stockData.length > 0) {
      console.group('StockChart Debug Info');
      console.log('Data summary:', {
        stockDataLength: stockData?.length || 0,
        candlesticksLength: candlesticks?.length || 0,
        volumeBarsLength: volumeBars?.length || 0,
        hasSMA10, hasSMA20, hasSMA50
      });
      
      if (stockData.length > 0 && (!candlesticks || candlesticks.length === 0)) {
        console.warn('Missing candlesticks despite having stock data!');
        console.log('First data point:', stockData[0]);
        
        // Check if scales are working properly
        if (scales) {
          const i = 0; // First point
          console.log('Scale test for first data point:', {
            domainIncludes: scales.xScale.domain().includes(i),
            xPos: scales.xScale(i),
            yPosOpen: scales.priceScale(stockData[i].open),
            yPosClose: scales.priceScale(stockData[i].close),
            yPosHigh: scales.priceScale(stockData[i].high),
            yPosLow: scales.priceScale(stockData[i].low)
          });
        }
      }
      console.groupEnd();
    }
  }, [stockData, candlesticks, volumeBars, scales, hasSMA10, hasSMA20, hasSMA50]);

  if (!dimensions || !scales || !stockData.length) {
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
  const mainDataEndX = scales.xScale(stockData.length - 1);
  
  // For precise alignment, we need the actual width of candlesticks
  // Used in the rendering to ensure consistent sizing
  const candlestickWidth = scales.xScale.step();
  const candleBarWidth = candlestickWidth * 0.8; // Width used in candlestick rendering
  
  // EXTREME FIX: Calculate the exact position for the vertical divider line
  // Get position of the last point in the main data
  const lastMainDataX = scales.xScale(stockData.length - 1);
  
  // Calculate the correct position for the divider line - EXACTLY at the split point
  // Position it precisely at the boundary between the last point of main data and first point of after data
  const dividerLineX = scales.xScale(stockData.length - 1) + scales.xScale.step();
  
  // Debug logs to verify exact positioning
  console.log("EXACT DIVIDER POSITIONING:", {
    lastMainDataX,
    firstAfterDataX: scales.xScale(stockData.length),
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
    <div ref={containerRef} className="w-full h-full stock-chart-container">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Add CSS to ensure proper sizing */}
        <defs>
          <style>
            {`
              @media (max-width: 1024px) {
                .stock-chart-container {
                  aspect-ratio: 1 / 1;
                  min-height: 300px;
                }
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
        
        {/* SMA Legend */}
        {(showSMA || forceShowSMA) && chartType !== 'monthly' && chartType !== 'M' && chartType !== 'minute' && (
          <g transform={`translate(${dimensions.margin.left + 10}, ${dimensions.margin.top + 10})`}>
            {/* 10 SMA - Always show for daily or if data exists */}
            {(chartType === 'hourly' || chartType === 'H' || chartType === 'default' || chartType === 'D' || hasSMA10) && (
              <g transform="translate(0, 0)">
                <line x1="0" y1="0" x2="15" y2="0" stroke={CHART_CONFIG.COLORS.SMA10} strokeWidth="2" />
                <text x="20" y="4" fontSize="10" fill="#ffffff">10 SMA</text>
              </g>
            )}
            
            {/* 20 SMA - Always show for daily or if data exists */}
            {(chartType === 'hourly' || chartType === 'H' || chartType === 'default' || chartType === 'D' || hasSMA20) && (
              <g transform="translate(0, 15)">
                <line x1="0" y1="0" x2="15" y2="0" stroke={CHART_CONFIG.COLORS.SMA20} strokeWidth="2" />
                <text x="20" y="4" fontSize="10" fill="#ffffff">20 SMA</text>
              </g>
            )}
            
            {/* 50 SMA - Don't show for hourly charts, show for daily even if no data */}
            {(chartType !== 'hourly' && chartType !== 'H') && (chartType === 'default' || chartType === 'D' || hasSMA50) && (
              <g transform="translate(0, 30)">
                <line x1="0" y1="0" x2="15" y2="0" stroke={CHART_CONFIG.COLORS.SMA50} strokeWidth="2" />
                <text x="20" y="4" fontSize="10" fill="#ffffff">50 SMA</text>
              </g>
            )}
          </g>
        )}
        
        {/* Dark background for after data area only - only applies to the main chart (D) */}
        {shouldShowBackground && !backgroundColor && chartType !== 'previous' && (
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
            {(showSMA || forceShowSMA) && chartType !== 'monthly' && chartType !== 'M' && chartType !== 'minute' && (
              <>
                {/* SMA10 line - make sure it works for hourly charts too */}
                {sma10Line && (hasSMA10 || chartType === 'hourly' || chartType === 'H') && (
                  <path
                    d={(() => {
                      try {
                        const pathData = sma10Line(stockData);
                        if (chartType === 'hourly' || chartType === 'H') {
                          console.log("Generated SMA10 path for hourly:", pathData ? "Valid path data" : "Empty path");
                        } else {
                          console.log("Generated SMA10 path:", pathData ? "Valid path data" : "Empty path");
                        }
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
                        if (chartType === 'hourly' || chartType === 'H') {
                          console.log("Generated SMA20 path for hourly:", pathData ? "Valid path data" : "Empty path");
                        } else {
                          console.log("Generated SMA20 path:", pathData ? "Valid path data" : "Empty path");
                        }
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
                
                {/* SMA50 line */}
                {sma50Line && hasSMA50 && chartType !== 'hourly' && chartType !== 'H' && (
                  <path
                    d={(() => {
                      try {
                        const pathData = sma50Line(stockData);
                        console.log("Generated SMA50 path:", pathData ? "Valid path data" : "Empty path");
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
                
                {/* SMA lines for after data - only show if after data is visible */}
                {(showAfterAnimation || afterAnimationComplete) && visibleAfterData.length > 0 && chartType !== 'monthly' && chartType !== 'M' && chartType !== 'minute' && (
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
                {console.log(`Rendering ${candlesticks.length} candlesticks`)}
            {candlesticks.map((candle, i) => (
              <g key={`main-${i}`}>
                  <line
                    x1={candle.x + candle.width / 2}
                    y1={candle.highY}
                    x2={candle.x + candle.width / 2}
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
            {volumeBars && volumeBars.length > 0 ? (
              <>
                {console.log(`Rendering ${volumeBars.length} volume bars`)}
                {volumeBars.map((bar, i) => (
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

export default StockChart;