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
import React, { useMemo, useState, useEffect } from "react";
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
      UP: "#00E676",     // Green for price increases
      DOWN: "#FF1744",   // Red for price decreases
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
      UP: "#4CAF50",     // Darker green for after chart
      DOWN: "#F44336",   // Darker red for after chart
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
  showSMA = true, 
  includeAuth = false, 
  chartType = 'default', 
  height = null,
  backgroundColor = null 
}) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth < 768);
      }
    };
    
    checkMobile();
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkMobile);
      
      return () => {
        window.removeEventListener('resize', checkMobile);
      };
    }
  }, []);
  
  // Get responsive chart configuration
  const CHART_CONFIG = useMemo(() => getChartConfig(isMobile, chartType), [isMobile, chartType]);

  if (!data) {
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
      const jsonData = data;
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
  }, [data]);

  // Calculate chart dimensions and scales
  const dimensions = useMemo(() => {
    if (!stockData.length) return null;

    const width = 800;
    const height = 400;
    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Calculate price range including SMAs
    const allValues = stockData.flatMap(d => [
      d.high,
      d.low,
      d.close,
      d.sma10,
      d.sma20,
      d.sma50
    ].filter(v => !isNaN(v))); // Filter out any NaN values
    const priceMin = Math.min(...allValues);
    const priceMax = Math.max(...allValues);
    const priceRange = priceMax - priceMin;
    const pricePadding = priceRange * 0.1;

    // Calculate volume range
    const volumeMax = Math.max(...stockData.map(d => d.volume));
    const volumePadding = volumeMax * 0.1;

    return {
      width,
      height,
      margin,
      innerWidth,
      innerHeight,
      priceScale: scaleLinear()
        .domain([priceMin - pricePadding, priceMax + pricePadding])
        .range([innerHeight, 0]),
      volumeScale: scaleLinear()
        .domain([0, volumeMax + volumePadding])
        .range([innerHeight * 0.2, 0]),
      xScale: scalePoint()
        .domain(stockData.map((_, i) => i))
        .range([0, innerWidth])
        .padding(0.5),
    };
  }, [stockData]);

  // Create price line generator
  const priceLine = useMemo(() => {
    if (!dimensions) return null;
    return line()
      .x((_, i) => dimensions.xScale(i))
      .y(d => dimensions.priceScale(d.close));
  }, [dimensions]);

  // Create SMA line generators
  const sma10Line = useMemo(() => {
    if (!dimensions) return null;
    return line()
      .x((_, i) => dimensions.xScale(i))
      .y(d => dimensions.priceScale(d.sma10));
  }, [dimensions]);

  const sma20Line = useMemo(() => {
    if (!dimensions) return null;
    return line()
      .x((_, i) => dimensions.xScale(i))
      .y(d => dimensions.priceScale(d.sma20));
  }, [dimensions]);

  const sma50Line = useMemo(() => {
    if (!dimensions) return null;
    return line()
      .x((_, i) => dimensions.xScale(i))
      .y(d => dimensions.priceScale(d.sma50));
  }, [dimensions]);

  // Create volume bars generator
  const volumeBars = useMemo(() => {
    if (!dimensions) return null;
    return stockData.map((d, i) => {
      const x = dimensions.xScale(i);
      const width = dimensions.xScale.step() * 0.8;
      const y = dimensions.priceScale(d.close);
      const height = dimensions.volumeScale(d.volume);
      return {
        x: x - width / 2,
        y: y - height,
        width,
        height,
      };
    });
  }, [stockData, dimensions]);

  // Create candlestick elements
  const candlesticks = useMemo(() => {
    if (!dimensions) return null;
    return stockData.map((d, i) => {
      const x = dimensions.xScale(i);
      const width = dimensions.xScale.step() * 0.8;
      const openY = dimensions.priceScale(d.open);
      const closeY = dimensions.priceScale(d.close);
      const highY = dimensions.priceScale(d.high);
      const lowY = dimensions.priceScale(d.low);
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
  }, [stockData, dimensions]);

  if (!dimensions || !stockData.length) {
    return <div>Loading chart data...</div>;
  }

  return (
    <div className="relative">
      <svg
        width={dimensions.width}
        height={dimensions.height}
        className="mx-auto"
      >
        <g transform={`translate(${dimensions.margin.left},${dimensions.margin.top})`}>
          {/* Price line */}
          <path
            d={priceLine(stockData)}
            fill="none"
            stroke="#4F46E5"
            strokeWidth={2}
          />
          
          {/* SMA lines */}
          {showSMA && (
            <>
              <path
                d={sma10Line(stockData)}
                fill="none"
                stroke="#EF4444"
                strokeWidth={1}
                strokeDasharray="4,4"
              />
              <path
                d={sma20Line(stockData)}
                fill="none"
                stroke="#10B981"
                strokeWidth={1}
                strokeDasharray="4,4"
              />
              <path
                d={sma50Line(stockData)}
                fill="none"
                stroke="#F59E0B"
                strokeWidth={1}
                strokeDasharray="4,4"
              />
            </>
          )}
          
          {/* Volume bars */}
          {volumeBars.map((bar, i) => (
            <rect
              key={i}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              fill={candlesticks[i].isUp ? "#4F46E5" : "#EF4444"}
              opacity={0.3}
            />
          ))}
          
          {/* Candlesticks */}
          {candlesticks.map((candle, i) => (
            <g key={i}>
              <line
                x1={candle.x + candle.width / 2}
                y1={candle.highY}
                x2={candle.x + candle.width / 2}
                y2={candle.lowY}
                stroke={candle.isUp ? "#4F46E5" : "#EF4444"}
                strokeWidth={1}
              />
              <rect
                x={candle.x}
                y={Math.min(candle.openY, candle.closeY)}
                width={candle.width}
                height={Math.abs(candle.closeY - candle.openY)}
                fill={candle.isUp ? "#4F46E5" : "#EF4444"}
                stroke={candle.isUp ? "#4F46E5" : "#EF4444"}
                strokeWidth={1}
              />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};

export default StockChart;
