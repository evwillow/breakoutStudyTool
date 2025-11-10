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
import { AuthModal } from "../Auth";

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
      SMA10: "#00D4FF",  // Vibrant cyan for 10-period moving average - fast, reactive
      SMA20: "#7C3AED",  // Purple for 20-period moving average - medium term
      SMA50: "#F59E0B",  // Amber orange for 50-period moving average - long term
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
      SMA10: "#00D4FF",  // Keep consistent with main chart - vibrant cyan
      SMA20: "#7C3AED",  // Keep consistent with main chart - purple
      SMA50: "#F59E0B",  // Keep consistent with main chart - amber orange
      GRID: "#444444",   // Darker grid lines for better visibility on transparent background
      TEXT: "#ffffff",   // White text for labels
    };
    config.BACKGROUND = "transparent"; // Transparent background for after chart
  }
  
  // Special color scheme for hourly chart
  if (chartType === 'hourly') {
    config.COLORS = {
      ...config.COLORS,
      SMA10: "#00D4FF",  // Vibrant cyan for hourly 10-period moving average - fast, reactive
      SMA20: "#7C3AED",  // Purple for hourly 20-period moving average - medium term
      SMA50: "#F59E0B",  // Amber orange for hourly 50-period moving average (if shown)
    };
    config.SMA_LINE_WIDTH = isMobile ? 1.5 : 2.5;
    config.SMA_LINE_OPACITY = 0.95;
  }
  
  // Add extra top padding for default charts to align with hourly chart top border
  if (chartType === 'default' || chartType === 'D') {
    config.PADDING.top = isMobile ? 20 : 30; // Increased from 10/20 to 20/30
  }
  
  // For previous charts, minimize padding to fill space
  if (chartType === 'previous') {
    config.PADDING.top = 0;
    config.PADDING.bottom = 0;
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
  
  // Check if SMAs exist in the data (after normalization)
  const hasSMA10 = processedData.some(d => d.sma10 !== null && d.sma10 !== undefined && !isNaN(d.sma10));
  const hasSMA20 = processedData.some(d => d.sma20 !== null && d.sma20 !== undefined && !isNaN(d.sma20));
  const hasSMA50 = processedData.some(d => d.sma50 !== null && d.sma50 !== undefined && !isNaN(d.sma50));
  
  console.log(`SMA data present after normalization: SMA10: ${hasSMA10}, SMA20: ${hasSMA20}, SMA50: ${hasSMA50}`);
  
  // For hourly charts, always ensure SMA10 and SMA20 are available (calculate if missing)
  if (chartType === 'hourly' || chartType === 'H') {
    if (!hasSMA10) {
      console.log('Calculating SMA10 for hourly chart as it is not present in the data');
      calculateSMA(processedData, 10, 'close', 'sma10');
    }
    if (!hasSMA20) {
      console.log('Calculating SMA20 for hourly chart as it is not present in the data');
      calculateSMA(processedData, 20, 'close', 'sma20');
    }
  }
  
  // Calculate SMAs if they don't exist in the data (for non-monthly charts)
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
  
  // For hourly charts, only display SMA10 and SMA20 (not SMA50)
  if (chartType === 'hourly' || chartType === 'H') {
    showSMA10 = true;
    showSMA20 = true;
    showSMA50 = false; // Don't show SMA50 for hourly charts
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
  forceShowSMA = false,
  onChartClick = null,
  userSelection = null,
  targetPoint = null,
  disabled = false,
  timerRightEdge = null,
  timerLeftEdge = null,
  dLabelRightEdge = null,
  dLabelCenterY = null
}) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dimensions, setDimensions] = useState(null);
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const lastDimensionsRef = useRef({ width: 0, height: 0 });
  const handleChartClickRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const isInSelectableAreaRef = useRef(false);
  
  // Use either data or csvData prop
  const chartData = data || csvData;
  
  // Handle container resize with debounce for performance
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const isMobileView = window.innerWidth < 1024 || 'ontouchstart' in window; // Match ChartSection's mobile detection
        
        // Use the container's actual height (set by parent's aspect ratio)
        // This respects the parent container's aspect ratio on both mobile and desktop
        let containerHeight = containerRef.current.clientHeight;
        
        // If height is not available yet (container not fully rendered), try parent
        if (!containerHeight || containerHeight < 400) {
          const parent = containerRef.current.parentElement;
          containerHeight = parent?.clientHeight || parent?.offsetHeight;
          
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
        
        const margin = { 
          top: 0, // No top margin - chart extends to top of container
          right: isMobileView ? 10 : 15, 
          bottom: 0, // No bottom margin - volume section extends to bottom of container
          left: 0 // No left margin - chart extends to left edge of container
        };
        
        const innerWidth = containerWidth - margin.left - margin.right;
        const innerHeight = containerHeight - margin.top - margin.bottom;
        
        // Only update dimensions if they actually changed (prevent feedback loop)
        const newDims = {
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
    let timeoutId;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateDimensions, 150);
    };

    // Initial dimensions
    updateDimensions();

    // Create resize observer - only observe container size changes, not content changes
    // Use ResizeObserver on the container itself to track size changes
    const resizeObserver = new ResizeObserver((entries) => {
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
  }, []);
  
  // Get responsive chart configuration
  const CHART_CONFIG = useMemo(() => getChartConfig(isMobile, chartType), [isMobile, chartType]);

  if (!chartData) {
    // Return empty div to maintain layout - parent will handle loading state
    return <div ref={containerRef} className="w-full h-full min-h-[400px] bg-black transition-opacity duration-500 ease-in-out" />;
  }

  // Parse JSON data into an array of stock objects - memoized for performance
  const stockData = useMemo(() => processChartData(chartData, chartType), [chartData, chartType]);
  const afterStockData = useMemo(() => {
    if (!afterData) return [];
    
    const processedAfterData = processChartData(afterData, chartType);
    

    return processedAfterData;
  }, [afterData, chartType, stockData]);

  // Check if SMAs are available
  const hasSMA10 = stockData.some(item => item.sma10 !== null && item.sma10 !== undefined && !isNaN(item.sma10));
  const hasSMA20 = stockData.some(item => item.sma20 !== null && item.sma20 !== undefined && !isNaN(item.sma20));
  const hasSMA50 = stockData.some(item => item.sma50 !== null && item.sma50 !== undefined && !isNaN(item.sma50));

  // Memoize visible after data calculation
  // IMPORTANT: For D charts, we show after.json data but don't use its prices for scaling
  // This prevents revealing prediction information through scale while still showing the data
  const visibleAfterData = useMemo(() => {
    if (!afterStockData.length) return [];
    
    // Calculate how many bars to show based on progress percentage
    const totalAfterBars = afterStockData.length;
    const visibleBars = Math.floor(totalAfterBars * (progressPercentage / 100));
    
    // Return the visible portion of after data
    return afterStockData.slice(0, visibleBars);
  }, [afterStockData, progressPercentage]);

  // Determine if we should show the background based on visible after data
  const shouldShowBackground = visibleAfterData.length > 0;

  // Calculate scales with zoom out for combined data view
  const scales = useMemo(() => {
    if (!dimensions || !stockData.length) return null;

    // Log the first data point in hourly mode
    if (chartType === 'hourly') {
      console.log("First data point for hourly with SMAs:", stockData[0]);
    }

    // SMA detection for chart scaling (debugging removed)

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
    // IMPORTANT: For D chart (default/D), NEVER look at after.json prices to prevent revealing prediction data
    // Instead, add generous padding above D.json data based only on D.json range
    const isDChart = chartType === 'default' || chartType === 'D';
    let afterMin = mainMin;
    let afterMax = mainMax;

    if (afterStockData.length > 0 && !isDChart) {
      // Only calculate after data min/max for non-D charts
      // D charts must NEVER peek at after.json prices
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

    // Calculate combined range for zoom out functionality
    // For D charts: use generous padding above D.json data (based only on D.json range, not after.json)
    // IMPORTANT: Always apply padding for D charts, even if after.json hasn't loaded yet
    // This prevents the chart from jumping when after.json loads later
    let combinedMin, combinedMax;
    
    if (isDChart) {
      // For D charts: ALWAYS add generous padding above D.json data WITHOUT looking at after.json prices
      // This prevents vertical compression AND prevents jumping when after.json loads
      const mainRange = mainMax - mainMin;
      const paddingAbove = mainRange * 0.5; // Add 50% of D.json range as padding above
      const paddingBelow = mainRange * 0.1; // 10% padding below for consistency
      combinedMin = mainMin - paddingBelow;
      combinedMax = mainMax + paddingAbove;
    } else {
      // For non-D charts, use actual after.json data for scaling
      combinedMin = Math.min(mainMin, afterMin);
      combinedMax = Math.max(mainMax, afterMax);
    }
    
    // NEW ZOOM OUT LOGIC: 
    // - When zoomPercentage > 0, we zoom out to show the full combined range
    // - When showAfterAnimation is true, we show the turquoise line and background
    // - progressPercentage controls how many after candles are revealed
    // - Use smooth interpolation to prevent "bump" when animation starts
    // - For D charts: Always add space above D.json data (based on D.json range only, never after.json prices)
    
    let currentMin, currentMax;
    let totalDataPoints;
    let combinedIndices;
    
    // Always prepare for combined view if after data exists
    // This prevents scale domain changes that cause visual bumps
    const hasAfterData = afterStockData.length > 0;
    
    if (hasAfterData && !isDChart) {
      // If we have after data and it's not a D chart, use the combined indices for X scale
      // This prevents the X axis from jumping when animation starts
      totalDataPoints = stockData.length + afterStockData.length;
      combinedIndices = [...Array(totalDataPoints).keys()];
      
      // Smoothly interpolate the price scale domain based on zoomPercentage
      // When zoomPercentage is 0, show main range; when 100, show combined range
      const zoomFactor = zoomPercentage / 100;
      const minRange = mainMin;
      const maxRange = mainMax;
      const minCombined = combinedMin;
      const maxCombined = combinedMax;
      
      // Interpolate between main range and combined range
      currentMin = minRange + (minCombined - minRange) * zoomFactor;
      currentMax = maxRange + (maxCombined - maxRange) * zoomFactor;
    } else if (isDChart) {
      // D CHART MODE: Always use combined range for Y-axis scale (prevents vertical compression and jumping)
      // The combined range includes generous padding above D.json data (calculated WITHOUT looking at after.json prices)
      // After.json data is rendered but scale is based on padding, not actual after.json prices
      // Apply padding even if after.json hasn't loaded yet to prevent jumping
      currentMin = combinedMin;
      currentMax = combinedMax;
      totalDataPoints = hasAfterData ? stockData.length + afterStockData.length : stockData.length;
      combinedIndices = [...Array(totalDataPoints).keys()];
    } else {
      // NORMAL MODE: No after data available
      currentMin = mainMin;
      currentMax = mainMax;
      totalDataPoints = stockData.length;
      combinedIndices = [...Array(stockData.length).keys()];
    }

    // Add consistent padding - extend more for clickable selection area
    const priceRange = currentMax - currentMin;
    // For previous charts, use no padding to fill the space completely
    // For other charts, use 20% padding to allow selecting beyond chart
    const pricePadding = chartType === 'previous' ? 0 : priceRange * 0.2;

    // Calculate volume range
    const volumeValues = stockData.map(d => {
      // Handle different volume property names
      const vol = d.volume || d.Volume || d.VOLUME;
      return vol !== undefined && vol !== null && !isNaN(vol) ? parseFloat(vol) : 0;
    }).filter(v => v > 0);
    
    const volumeMax = volumeValues.length > 0 ? Math.max(...volumeValues) : 1; // Default to 1 if no volume data
    // For previous charts, use no padding so volume bars reach the bottom
    // For other charts, use 10% padding
    const volumePadding = chartType === 'previous' ? 0 : volumeMax * 0.1;

    // Calculate heights for price and volume sections
    // On mobile, give volume a bit more space for better visibility
    // For previous charts, hide volume completely and use full height for price
    const totalHeight = dimensions.innerHeight;
    let volumePercentage, volumeHeight, priceHeight;
    if (chartType === 'previous') {
      // Previous charts: no volume, price takes full height
      volumePercentage = 0;
      volumeHeight = 0;
      priceHeight = totalHeight;
    } else {
      volumePercentage = isMobile ? 0.25 : 0.2; // 25% on mobile, 20% on desktop
      volumeHeight = totalHeight * volumePercentage;
      priceHeight = totalHeight - volumeHeight;
    }

    // Get the last valid price for labels
    const lastValidDataPoint = stockData[stockData.length - 1];
    const lastPrice = lastValidDataPoint?.close || lastValidDataPoint?.Close;

    // Extend time indices to allow clicking beyond current data
    // On mobile, provide enough space for selection but keep chart compact
    const extendedIndices = [...combinedIndices];
    if (onChartClick) {
      if (isMobile) {
        // On mobile, use a fixed reasonable amount of space (about 30% of data length, but min 15 points)
        const extensionCount = Math.max(15, Math.floor(combinedIndices.length * 0.3)); // Min 15 points, or 30% of data
        for (let i = 0; i < extensionCount; i++) {
          extendedIndices.push(combinedIndices[combinedIndices.length - 1] + i + 1);
        }
      } else {
        // Extend indices for future predictions - desktop
        const extensionCount = Math.floor(combinedIndices.length * 0.5); // 50% on desktop
        for (let i = 0; i < extensionCount; i++) {
          extendedIndices.push(combinedIndices[combinedIndices.length - 1] + i + 1);
        }
      }
    }
    
    // Adjust padding for mobile - reduce padding to move data visualization further right
    // Reduced padding so data takes up more of the chart width, moving the divider line further right
    const xScalePadding = isMobile ? 0.05 : 0.1;
    
    // Calculate x-scale range so that the last D.json data point ends at the divider line
    // Divider line position: Mobile 70%, Desktop 75% of innerWidth
    const DIVIDER_POSITION_PERCENT = isMobile ? 0.70 : 0.75;
    const dividerPositionInChart = dimensions.innerWidth * DIVIDER_POSITION_PERCENT;
    
    // For previous charts, add a tiny bit of space on the right to make stock information easier to read
    let xScaleRangeMultiplier = isMobile ? 1.05 : 1.2; // Mobile: 105%, Desktop: 120%
    if (chartType === 'previous') {
      xScaleRangeMultiplier = isMobile ? 1.1 : 1.25; // Mobile: 110%, Desktop: 125% - adds just a tiny bit of space on right
    }
    
    // Calculate x-scale range so last D.json data point ends exactly at divider line
    // For non-previous charts, adjust range so last data point aligns with divider
    let xScaleRangeEnd = dimensions.innerWidth * xScaleRangeMultiplier;
    
    if (chartType !== 'previous' && stockData.length > 0) {
      const numMainDataPoints = stockData.length;
      const lastMainDataIndex = numMainDataPoints - 1;
      
      // Calculate range so last D.json data point ends exactly at divider line
      // Use only main data indices for calculation (not extended), but result applies to extended scale
      const mainDataIndices = [...Array(numMainDataPoints).keys()];
      
      // Iteratively find the correct range
      let currentRange = dividerPositionInChart * 1.15; // Start with estimate
      let iterations = 0;
      const maxIterations = 50; // More iterations for precision
      let bestRange = currentRange;
      let bestDifference = Infinity;
      
      while (iterations < maxIterations) {
        // Create test scale with main data indices only for calculation
        const testScale = scalePoint()
          .domain(mainDataIndices)
          .range([0, currentRange])
          .padding(xScalePadding);
        
        // Get the actual position of the last main data point
        const lastCenterX = testScale(lastMainDataIndex);
        if (lastCenterX === undefined || isNaN(lastCenterX)) {
          currentRange = bestRange;
          break;
        }
        
        const step = testScale.step();
        // Candlestick rect: x = center - width/2, so right edge = center + width/2
        // width = step * 0.8, so right edge = center + (step * 0.8) / 2 = center + step * 0.4
        const lastRightEdge = lastCenterX + (step * 0.4);
        
        // Check precision
        const difference = Math.abs(lastRightEdge - dividerPositionInChart);
        if (difference < bestDifference) {
          bestDifference = difference;
          bestRange = currentRange;
        }
        
        // If very close, we're done
        if (difference < 0.01) {
          xScaleRangeEnd = currentRange;
          break;
        }
        
        // Adjust range proportionally
        const adjustment = dividerPositionInChart / lastRightEdge;
        const newRange = currentRange * adjustment;
        
        // Safety checks
        if (newRange <= 0 || newRange > dimensions.innerWidth * 5 || !isFinite(newRange)) {
          currentRange = bestRange;
          break;
        }
        
        currentRange = newRange;
        iterations++;
      }
      
      // Now verify and adjust for extendedIndices (which has more points for selection area)
      // The extendedIndices will change the step size, so we need to recalculate
      if (extendedIndices.length > mainDataIndices.length) {
        // Recalculate with extendedIndices to get the correct range
        let extendedRange = bestRange;
        let extendedIterations = 0;
        const maxExtendedIterations = 30;
        
        while (extendedIterations < maxExtendedIterations) {
          const verifyScale = scalePoint()
            .domain(extendedIndices)
            .range([0, extendedRange])
            .padding(xScalePadding);
          
          const verifyLastX = verifyScale(lastMainDataIndex);
          if (verifyLastX === undefined || isNaN(verifyLastX)) {
            break;
          }
          
          const verifyStep = verifyScale.step();
          const verifyRightEdge = verifyLastX + (verifyStep * 0.4);
          const verifyDiff = Math.abs(verifyRightEdge - dividerPositionInChart);
          
          if (verifyDiff < 0.01) {
            bestRange = extendedRange;
            break;
          }
          
          const verifyAdjustment = dividerPositionInChart / verifyRightEdge;
          extendedRange = extendedRange * verifyAdjustment;
          
          if (extendedRange <= 0 || extendedRange > dimensions.innerWidth * 5 || !isFinite(extendedRange)) {
            break;
          }
          
          extendedIterations++;
        }
        
        bestRange = extendedRange;
      }
      
      xScaleRangeEnd = bestRange;
    }
    
    return {
      priceScale: scaleLinear()
        .domain([currentMin - pricePadding, currentMax + pricePadding])
        .range([priceHeight, 0]),
      volumeScale: scaleLinear()
        .domain([0, volumeMax + volumePadding])
        .range([volumeHeight, 0]),
      xScale: scalePoint()
        .domain(extendedIndices)
        // Range calculated so last D.json data point ends exactly at divider line position
        .range([0, xScaleRangeEnd])
        .padding(xScalePadding),
      priceHeight,
      volumeHeight,
      useFullDomain: zoomPercentage > 0,
      lastPrice,
      isZoomedOut: zoomPercentage > 0,
      extendedDomain: extendedIndices.length > combinedIndices.length
    };
  }, [dimensions, stockData, afterStockData, hasSMA10, hasSMA20, hasSMA50, visibleAfterData, zoomPercentage, isMobile, chartType]);

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
      return [];
    }
    
    // Check if scales are properly initialized
    if (!scales.xScale || !scales.priceScale) {
      console.warn("Scales not properly initialized, skipping candlestick generation");
      return [];
    }
    
    
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
          ? (i * (dimensions.innerWidth / (scales.isZoomedOut ? stockData.length + afterStockData.length : stockData.length))) 
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
    
    return result;
  }, [scales, stockData, dimensions, zoomPercentage, afterStockData.length]);
  
  // Create volume bars generator - simplified approach
  const volumeBars = useMemo(() => {
    if (!scales || !stockData || stockData.length === 0) {
      return [];
    }
    
    
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
        // Calculate position using scale - works for both normal and zoomed out modes
        const x = scales.xScale(i);
        // If x is undefined or NaN, use a simple fallback calculation
        const finalX = (x === undefined || isNaN(x)) 
          ? (i * (dimensions.innerWidth / (scales.isZoomedOut ? stockData.length + afterStockData.length : stockData.length))) 
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
    }).filter(Boolean); // Remove any null entries
    
    return result;
  }, [scales, stockData, dimensions, zoomPercentage, afterStockData.length, chartType]);

  // Create candlestick elements for after data with progressive reveal
  const afterCandlesticks = useMemo(() => {
    // Only show after candlesticks when zoomed out and animation is active
    if (!scales || !scales.isZoomedOut || !showAfterAnimation || !visibleAfterData || visibleAfterData.length === 0) {
      return [];
    }
    
    // Calculate offset based on original data length
    const offset = stockData.length;
    
    
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
        // Calculate position using scale - in zoom out mode, use the full combined scale
        const index = offset + i;
        const x = scales.xScale(index);
        // If x is undefined or NaN, use a simple fallback calculation
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
    }).filter(Boolean); // Remove any null entries
    
    return result;
  }, [scales, stockData.length, visibleAfterData, dimensions, showAfterAnimation, zoomPercentage, progressPercentage, afterStockData.length]);

  // Create volume bars for after data with the same simplified approach
  const afterVolumeBars = useMemo(() => {
    // Only show after volume bars when zoomed out and animation is active
    if (!scales || !scales.isZoomedOut || !showAfterAnimation || !visibleAfterData || visibleAfterData.length === 0) {
      return [];
    }
    
    // Calculate offset based on original data length
    const offset = stockData.length;
    
    
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
        // Calculate position using scale - in zoom out mode, use the full combined scale
        const index = offset + i;
        const x = scales.xScale(index);
        // If x is undefined or NaN, use a simple fallback calculation
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
    }).filter(Boolean);
    
    return result;
  }, [scales, stockData.length, visibleAfterData, dimensions, showAfterAnimation, zoomPercentage, progressPercentage, afterStockData.length]);

  // Handle chart click - MUST be before any early returns to avoid hook order issues
  const handleChartClick = useCallback((event) => {
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
    const svgPoint = point.matrixTransform(svgRef.current.getScreenCTM().inverse());
    
    // Get chart coordinates (accounting for margins)
            const chartX = svgPoint.x - (dimensions.margin.left || 0);
            const chartY = svgPoint.y - (dimensions.margin.top || 0);
    
    // Get the last data point index and position
    const lastDataIndex = stockData.length - 1;
    const lastDataCenterX = scales.xScale(lastDataIndex);
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
      containerRef.current.handleChartClick = handleChartClick;
      handleChartClickRef.current = handleChartClick;
    }
  }, [handleChartClick]);

  // Helper function to check if a position is in the selectable area
  const isInSelectableArea = useCallback((chartX) => {
    if (!scales || !stockData || stockData.length === 0) return false;
    
    const lastDataIndex = stockData.length - 1;
    const lastDataCenterX = scales.xScale(lastDataIndex);
    const step = scales.xScale.step();
    const borderLineOffsetForCursor = isMobile ? 1.0 : 1.5;
    const lastDataRightEdge = lastDataCenterX + (step / 2) + (step * borderLineOffsetForCursor);
    
    return chartX > lastDataRightEdge;
  }, [scales, stockData, isMobile]);

  // Handle mouse down to track dragging
  const handleMouseDown = useCallback((event) => {
    if (!onChartClick || disabled || !scales || !stockData || stockData.length === 0 || !svgRef.current) {
      return;
    }

    try {
      const point = svgRef.current.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const svgPoint = point.matrixTransform(svgRef.current.getScreenCTM().inverse());
      const chartX = svgPoint.x - (dimensions.margin.left || 0);
      
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
  const handleMouseMove = useCallback((event) => {
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
        const svgPoint = point.matrixTransform(svgRef.current.getScreenCTM().inverse());
        
        const chartX = svgPoint.x - (dimensions.margin.left || 0);
        const lastDataIndex = stockData.length - 1;
        const lastDataCenterX = scales.xScale(lastDataIndex);
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
  const handleMouseUp = useCallback((event) => {
    if (!isDraggingRef.current) return;
    
    isDraggingRef.current = false;
    isInSelectableAreaRef.current = false;
  }, []);

  // Add global mouse up listener to handle mouse up outside the chart
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDraggingRef.current = false;
      isInSelectableAreaRef.current = false;
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  // Handle touch events for mobile scrolling
  const handleTouchStart = useCallback((event) => {
    if (!onChartClick || disabled || !scales || !stockData || stockData.length === 0 || !svgRef.current) {
      return;
    }

    try {
      const touch = event.touches[0];
      const point = svgRef.current.createSVGPoint();
      point.x = touch.clientX;
      point.y = touch.clientY;
      const svgPoint = point.matrixTransform(svgRef.current.getScreenCTM().inverse());
      const chartX = svgPoint.x - (dimensions.margin.left || 0);
      
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

  const handleTouchMove = useCallback((event) => {
    // If dragging in non-selectable area, allow scrolling (don't prevent default)
    if (!isDraggingRef.current || !isInSelectableAreaRef.current) {
      return;
    }
    // If in selectable area, we could prevent default here if needed for selection
  }, []);

  const handleTouchEnd = useCallback((event) => {
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
  let dividerLineX, darkBackgroundWidth;
  
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
  const getProgressiveMaskWidth = () => {
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
        preserveAspectRatio={chartType === 'hourly' ? 'xMidYMid slice' : chartType === 'previous' ? 'xMinYMid meet' : 'xMidYMid meet'}
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
          const defaultX = Math.max((dimensions.margin?.left || 0) + 50, 50);
          
          let smaLabelX = defaultX;
          // Position just to the right of D label if we have the edge
          if (dLabelRightEdge !== null && dLabelRightEdge > 0) {
            // Position just to the right of D label with small padding
            smaLabelX = dLabelRightEdge + 8;
            // Ensure it's not too far left
            if (smaLabelX < defaultX) {
              smaLabelX = defaultX;
            }
          } else if (timerRightEdge !== null && timerRightEdge > 0) {
            // Fallback: align right edge of label with timer's right edge
            smaLabelX = Math.max(timerRightEdge - labelWidth, defaultX);
          }
          
          // Position at the top, aligned with D label and timer (same Y center as they are)
          // Use the D label's center Y if available, otherwise use default top position
          let smaLabelY;
          if (dLabelCenterY !== null && dLabelCenterY > 0) {
            // Position SMA labels to align with D label's vertical center
            // For daily charts, SMA labels have 3 lines (10, 20, 50) with height 56px
            // The center of the label group is approximately at y="28" from the group origin
            // (rect starts at y="-6" with height 56, center is at y="22", but text center is around y="27")
            // We want the center of the SMA label (around y="27") to align with D label center
            const smaLabelCenterOffset = 27; // Approximate center of the 3-line SMA label
            smaLabelY = dLabelCenterY - smaLabelCenterOffset;
          } else {
            // Fallback: position at top
            smaLabelY = Math.max((dimensions.margin?.top || 0) + 8, 8);
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
            {candlesticks.map((candle, i) => (
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
            {scales.isZoomedOut && showAfterAnimation && afterCandlesticks && afterCandlesticks.map((candle, i) => (
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
              
              {/* Volume bars for after data - only show when zoomed out */}
              {scales.isZoomedOut && showAfterAnimation && afterVolumeBars && afterVolumeBars.map((bar, i) => (
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