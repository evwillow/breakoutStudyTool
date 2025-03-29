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
import React, { useMemo, useState, useEffect, useRef } from "react";
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
      SMA10: "#e902f5",  // Purple for 10-period moving average
      SMA20: "#02ddf5",  // Cyan for 20-period moving average
      TEXT: "#ffffff",   // White text for labels
    },
    BACKGROUND: "#000000", // Default black background
  };
  
  // Special color scheme for "after" chart type
  if (chartType === 'after') {
    config.COLORS = {
      ...config.COLORS,
      UP: "#00C853",     // Standard green for after chart
      DOWN: "#FF1744",   // Standard red for after chart
      VOLUME: "#42A5F5", // Darker blue for after chart
      SMA10: "#9C27B0",  // Darker purple for after chart
      SMA20: "#00BCD4",  // Darker cyan for after chart
      GRID: "#444444",   // Darker grid lines for better visibility on transparent background
      TEXT: "#ffffff",   // White text for labels
    };
    config.BACKGROUND = "transparent"; // Transparent background for after chart
  }
  
  return config;
};

/**
 * StockChart component renders price and volume data with optional moving averages
 */
const StockChart = ({ 
  data,
  csvData,
  showSMA = true, 
  includeAuth = false, 
  chartType = 'default', 
  height = null,
  backgroundColor = null 
}) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dimensions, setDimensions] = useState(null);
  const containerRef = useRef(null);
  
  // Use either data or csvData prop
  const chartData = data || csvData;
  
  // Handle container resize
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

    // Initial dimensions
    updateDimensions();

    // Create resize observer
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Cleanup
    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, []);
  
  // Get responsive chart configuration
  const CHART_CONFIG = useMemo(() => getChartConfig(isMobile, chartType), [isMobile, chartType]);

  if (!chartData) {
    return (
      <div className="h-40 sm:h-60 flex items-center justify-center text-gray-500 text-sm sm:text-base">
        No data available
      </div>
    );
  }

  // Parse JSON data into an array of stock objects
  const stockData = useMemo(() => {
    try {
      // The data is already parsed JSON from the API
      const jsonData = chartData;
      if (!Array.isArray(jsonData)) {
        console.warn("Data is not an array");
        return [];
      }
      
      return jsonData.map(item => {
        // Parse numeric values
        const open = parseFloat(item.Open);
        const high = parseFloat(item.High);
        const low = parseFloat(item.Low);
        const close = parseFloat(item.Close);
        const volume = parseFloat(item.Volume);
        const sma10 = parseFloat(item["10sma"]);
        const sma20 = parseFloat(item["20sma"]);
        const sma50 = parseFloat(item["50sma"]);
        
        // Only include valid data points
        if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close) || isNaN(volume)) {
          return null;
        }
        
        return {
          open,
          high,
          low,
          close,
          volume,
          sma10,
          sma20,
          sma50
        };
      }).filter(Boolean);
    } catch (error) {
      console.error("Error processing JSON data:", error);
      return [];
    }
  }, [chartData]);

  // Calculate scales
  const scales = useMemo(() => {
    if (!dimensions || !stockData.length) return null;

    // Calculate price range including SMAs
    const allValues = stockData.flatMap(d => [
      d.high,
      d.low,
      d.close,
      d.sma10,
      d.sma20,
      d.sma50
    ].filter(v => !isNaN(v)));
    const priceMin = Math.min(...allValues);
    const priceMax = Math.max(...allValues);
    const priceRange = priceMax - priceMin;
    const pricePadding = priceRange * 0.1;

    // Calculate volume range
    const volumeMax = Math.max(...stockData.map(d => d.volume));
    const volumePadding = volumeMax * 0.1;

    // Calculate heights for price and volume sections
    const totalHeight = dimensions.innerHeight;
    const volumeHeight = totalHeight * 0.2; // 20% of total height for volume
    const priceHeight = totalHeight - volumeHeight;

    return {
      priceScale: scaleLinear()
        .domain([priceMin - pricePadding, priceMax + pricePadding])
        .range([priceHeight, 0]),
      volumeScale: scaleLinear()
        .domain([0, volumeMax + volumePadding])
        .range([volumeHeight, 0]),
      xScale: scalePoint()
        .domain(stockData.map((_, i) => i))
        .range([0, dimensions.innerWidth])
        .padding(0.5),
      priceHeight,
      volumeHeight
    };
  }, [dimensions, stockData]);

  // Create price line generator
  const priceLine = useMemo(() => {
    if (!scales) return null;
    return line()
      .x((_, i) => scales.xScale(i))
      .y(d => scales.priceScale(d.close));
  }, [scales]);

  // Create SMA line generators
  const sma10Line = useMemo(() => {
    if (!scales) return null;
    return line()
      .x((_, i) => scales.xScale(i))
      .y(d => scales.priceScale(d.sma10));
  }, [scales]);

  const sma20Line = useMemo(() => {
    if (!scales) return null;
    return line()
      .x((_, i) => scales.xScale(i))
      .y(d => scales.priceScale(d.sma20));
  }, [scales]);

  const sma50Line = useMemo(() => {
    if (!scales) return null;
    return line()
      .x((_, i) => scales.xScale(i))
      .y(d => scales.priceScale(d.sma50));
  }, [scales]);

  // Create volume bars generator
  const volumeBars = useMemo(() => {
    if (!scales) return null;
    return stockData.map((d, i) => {
      const x = scales.xScale(i);
      const width = scales.xScale.step() * 0.8;
      const height = scales.volumeScale(d.volume);
      return {
        x: x - width / 2,
        y: scales.volumeHeight - height, // Position at bottom of volume section
        width,
        height,
      };
    });
  }, [stockData, scales]);

  // Create candlestick elements
  const candlesticks = useMemo(() => {
    if (!scales) return null;
    return stockData.map((d, i) => {
      const x = scales.xScale(i);
      const width = scales.xScale.step() * 0.8;
      const openY = scales.priceScale(d.open);
      const closeY = scales.priceScale(d.close);
      const highY = scales.priceScale(d.high);
      const lowY = scales.priceScale(d.low);
      const isUp = d.close > d.open;
      return {
        x: x - width / 2,
        openY,
        closeY,
        highY,
        lowY,
        width,
        isUp,
      };
    });
  }, [stockData, scales]);

  if (!dimensions || !scales || !stockData.length) {
    return (
      <div ref={containerRef} className="w-full h-full min-h-[400px]">
        <div className="h-full flex items-center justify-center text-gray-500">
          Loading chart data...
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Add black background */}
        <rect
          x={0}
          y={0}
          width={dimensions.width}
          height={dimensions.height}
          fill="#000000"
        />
        <g transform={`translate(${dimensions.margin.left},${dimensions.margin.top})`}>
          {/* Price section */}
          <g transform={`translate(0, 0)`}>
            {/* SMA lines */}
            {showSMA && (
              <>
                <path
                  d={sma10Line(stockData)}
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth={1.5}
                />
                <path
                  d={sma20Line(stockData)}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth={1.5}
                />
                <path
                  d={sma50Line(stockData)}
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth={1.5}
                />
              </>
            )}
            
            {/* Candlesticks */}
            {candlesticks.map((candle, i) => (
              <g key={i}>
                <line
                  x1={candle.x + candle.width / 2}
                  y1={candle.highY}
                  x2={candle.x + candle.width / 2}
                  y2={candle.lowY}
                  stroke={candle.isUp ? "#00C853" : "#FF1744"}
                  strokeWidth={1}
                />
                <rect
                  x={candle.x}
                  y={Math.min(candle.openY, candle.closeY)}
                  width={candle.width}
                  height={Math.abs(candle.closeY - candle.openY)}
                  fill={candle.isUp ? "#00C853" : "#FF1744"}
                  stroke={candle.isUp ? "#00C853" : "#FF1744"}
                  strokeWidth={1}
                />
              </g>
            ))}
          </g>

          {/* Volume section */}
          <g transform={`translate(0, ${scales.priceHeight})`}>
            {/* Volume bars */}
            {volumeBars.map((bar, i) => (
              <rect
                key={i}
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                fill="#29B6F6"
                opacity={0.3}
              />
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
};

export default StockChart;
