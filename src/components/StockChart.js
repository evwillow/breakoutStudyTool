/**
 * StockChart.js
 * 
 * Component for rendering interactive stock price charts.
 * Features:
 * - Responsive design that adapts to different screen sizes
 * - Renders price and volume data from CSV input
 * - Calculates and displays moving averages (SMA)
 * - Supports different color schemes for up/down movements
 * - Optimized rendering with canvas for performance
 */
import React, { useMemo, useState, useEffect } from "react";
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
  csvData, 
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
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  // Get responsive chart configuration
  const CHART_CONFIG = useMemo(() => getChartConfig(isMobile, chartType), [isMobile, chartType]);

  if (!csvData || typeof csvData !== "string") {
    return (
      <div className="h-40 sm:h-60 flex items-center justify-center text-gray-500 text-sm sm:text-base">
        No data available
      </div>
    );
  }

  // Parse CSV data into an array of stock objects.
  const data = useMemo(() => {
    try {
      // Split by lines and filter out empty lines
      const lines = csvData.trim().split("\n").filter(line => line.trim());
      if (lines.length < 2) return [];
      
      // Get headers from first line and convert to lowercase for case-insensitive matching
      const headers = lines[0].toLowerCase().split(",").map(h => h.trim());
      
      // Find indices for required fields
      const indices = {
        open: headers.findIndex((h) => h.includes("open")),
        high: headers.findIndex((h) => h.includes("high")),
        low: headers.findIndex((h) => h.includes("low")),
        close: headers.findIndex((h) => h.includes("close")),
        volume: headers.findIndex((h) => h.includes("volume")),
      };
      
      // Ensure all required fields are found
      if (Object.values(indices).some(idx => idx === -1)) {
        console.error("Missing required columns in CSV data");
        return [];
      }
      
      // Parse data rows
      const result = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim());
        
        // Parse numeric values
        const open = parseFloat(values[indices.open]);
        const high = parseFloat(values[indices.high]);
        const low = parseFloat(values[indices.low]);
        const close = parseFloat(values[indices.close]);
        const volume = parseFloat(values[indices.volume]);
        
        // Only add valid data points
        if (
          !isNaN(open) &&
          !isNaN(high) &&
          !isNaN(low) &&
          !isNaN(close) &&
          !isNaN(volume)
        ) {
          result.push({
            open,
            high,
            low,
            close,
            dollarVolume: close * volume,
            isUp: close >= open,
          });
        }
      }
      return result;
    } catch (error) {
      console.error("Error parsing CSV:", error);
      return [];
    }
  }, [csvData]);

  // Compute chart data in a square viewBox.
  const chartData = useMemo(() => {
    if (!data.length) return null;

    // Price range calculations.
    const minPrice = Math.min(...data.map((d) => d.low));
    const maxPrice = Math.max(...data.map((d) => d.high));
    const maxDollarVolume = Math.max(...data.map((d) => d.dollarVolume));
    const priceRange = maxPrice - minPrice;
    const paddedMinPrice = minPrice - priceRange * 0.05;
    const paddedMaxPrice = maxPrice + priceRange * 0.05;

    // Horizontal spacing.
    const spacing = CHART_CONFIG.BAR_WIDTH + CHART_CONFIG.BAR_PADDING;
    // Compute intrinsic width: number of bars plus five extra periods plus left/right padding.
    const intrinsicWidth =
      CHART_CONFIG.PADDING.left +
      (data.length + 5) * spacing +
      CHART_CONFIG.PADDING.right;
    const chartSize = intrinsicWidth; // square chart

    // Vertical areas: 75% for price, 25% for volume.
    const priceAreaHeight = chartSize * 0.75;
    const volumeAreaHeight = chartSize * 0.25;

    // Price scale: map [paddedMinPrice, paddedMaxPrice] to [priceAreaHeight - PADDING.top, 0]
    const priceScale =
      (priceAreaHeight - CHART_CONFIG.PADDING.top) /
      (paddedMaxPrice - paddedMinPrice);
    // Volume scale: map [0, maxDollarVolume] to [0, volumeAreaHeight - PADDING.bottom]
    const volumeScale =
      (volumeAreaHeight - CHART_CONFIG.PADDING.bottom) / maxDollarVolume;

    // Price grid ticks.
    const step =
      (paddedMaxPrice - paddedMinPrice) / (CHART_CONFIG.PRICE_TICKS - 1);
    const priceTicks = Array.from(
      { length: CHART_CONFIG.PRICE_TICKS },
      (_, i) => {
        const value = paddedMinPrice + step * i;
        return {
          value,
          y: CHART_CONFIG.PADDING.top + (paddedMaxPrice - value) * priceScale,
        };
      }
    );

    // Candlestick bars (price area).
    const bars = data.map((d, i) => ({
      x: CHART_CONFIG.PADDING.left + i * spacing,
      openY: CHART_CONFIG.PADDING.top + (paddedMaxPrice - d.open) * priceScale,
      closeY:
        CHART_CONFIG.PADDING.top + (paddedMaxPrice - d.close) * priceScale,
      highY: CHART_CONFIG.PADDING.top + (paddedMaxPrice - d.high) * priceScale,
      lowY: CHART_CONFIG.PADDING.top + (paddedMaxPrice - d.low) * priceScale,
      width: CHART_CONFIG.BAR_WIDTH,
      isUp: d.isUp,
      volume: d.dollarVolume,
    }));

    // SMA calculations (only if showSMA is true).
    let sma10Points = [];
    let sma20Points = [];
    if (showSMA) {
      const calculateSMA = (period) => {
        return data.map((d, i) => {
          if (i < period - 1) {
            return null;
          }
          const slice = data.slice(i - period + 1, i + 1);
          const sum = slice.reduce((acc, cur) => acc + cur.close, 0);
          return sum / period;
        });
      };

      const sma10Array = calculateSMA(10);
      const sma20Array = calculateSMA(20);

      sma10Points = sma10Array
        .map((avg, i) => {
          if (avg === null) return null;
          const x =
            CHART_CONFIG.PADDING.left + i * spacing + CHART_CONFIG.BAR_WIDTH / 2;
          const y =
            CHART_CONFIG.PADDING.top + (paddedMaxPrice - avg) * priceScale;
          return { x, y };
        })
        .filter((point) => point !== null);

      sma20Points = sma20Array
        .map((avg, i) => {
          if (avg === null) return null;
          const x =
            CHART_CONFIG.PADDING.left + i * spacing + CHART_CONFIG.BAR_WIDTH / 2;
          const y =
            CHART_CONFIG.PADDING.top + (paddedMaxPrice - avg) * priceScale;
          return { x, y };
        })
        .filter((point) => point !== null);
    }

    // Volume bars (in the volume area, which starts at y = priceAreaHeight).
    const volumeBars = data.map((d, i) => ({
      x: CHART_CONFIG.PADDING.left + i * spacing,
      barWidth: CHART_CONFIG.BAR_WIDTH,
      barHeight: d.dollarVolume * volumeScale,
      y: chartSize - CHART_CONFIG.PADDING.bottom - d.dollarVolume * volumeScale,
    }));

    return { bars, priceTicks, volumeBars, chartSize, sma10Points, sma20Points };
  }, [data, showSMA, CHART_CONFIG]);

  if (!chartData) return null;

  // Determine background color based on configuration and props
  const bgColor = backgroundColor || CHART_CONFIG.BACKGROUND;

  return (
    <div 
      className="relative w-full h-full" 
      style={{ 
        height: height ? height : undefined,
        backgroundColor: bgColor
      }}
    >
      {/* If includeAuth is true, show the new auth button (or sign out when logged in) */}
      {includeAuth && (
        <div className="absolute top-2 right-2 z-10">
          <AuthButtons onSignIn={() => setShowAuthModal(true)} />
        </div>
      )}
      {includeAuth && showAuthModal && (
        <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
      )}
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${chartData.chartSize} ${chartData.chartSize}`}
        preserveAspectRatio="xMidYMid meet"
        className="text-gray-400"
      >
        {/* Background rect for the chart area */}
        {bgColor !== "transparent" && (
          <rect
            x="0"
            y="0"
            width={chartData.chartSize}
            height={chartData.chartSize}
            fill={bgColor}
          />
        )}
        
        {/* Draw price grid lines and labels */}
        {chartData.priceTicks.map((tick, i) => (
          <g key={`price-${i}`}>
            <line
              x1={CHART_CONFIG.PADDING.left}
              y1={tick.y}
              x2={chartData.chartSize - CHART_CONFIG.PADDING.right}
              y2={tick.y}
              stroke={CHART_CONFIG.COLORS.GRID}
              strokeWidth="1"
            />
            <text
              x={CHART_CONFIG.PADDING.left - 5}
              y={tick.y + 4}
              fontSize={isMobile ? "10" : "12"}
              textAnchor="end"
              fill={CHART_CONFIG.COLORS.TEXT}
            >
              {tick.value.toFixed(2)}
            </text>
          </g>
        ))}

        {/* Conditionally draw SMA lines */}
        {showSMA && (
          <>
            <polyline
              fill="none"
              stroke={CHART_CONFIG.COLORS.SMA10}
              strokeWidth={isMobile ? "1.5" : "2"}
              points={chartData.sma10Points
                .map((p) => `${p.x},${p.y}`)
                .join(" ")}
            />
            <polyline
              fill="none"
              stroke={CHART_CONFIG.COLORS.SMA20}
              strokeWidth={isMobile ? "1.5" : "2"}
              points={chartData.sma20Points
                .map((p) => `${p.x},${p.y}`)
                .join(" ")}
            />
          </>
        )}

        {/* Draw candlestick bars */}
        {chartData.bars.map((bar, i) => (
          <g key={`bar-${i}`}>
            {/* Vertical line from high to low */}
            <line
              x1={bar.x + bar.width / 2}
              y1={bar.highY}
              x2={bar.x + bar.width / 2}
              y2={bar.lowY}
              stroke={bar.isUp ? CHART_CONFIG.COLORS.UP : CHART_CONFIG.COLORS.DOWN}
              strokeWidth="1"
            />
            {/* Rectangle for open-close range */}
            <rect
              x={bar.x}
              y={bar.isUp ? bar.closeY : bar.openY}
              width={bar.width}
              height={Math.abs(bar.closeY - bar.openY) || 1}
              fill={bar.isUp ? CHART_CONFIG.COLORS.UP : CHART_CONFIG.COLORS.DOWN}
            />
          </g>
        ))}

        {/* Draw volume bars */}
        {chartData.volumeBars.map((bar, i) => (
          <rect
            key={`vol-${i}`}
            x={bar.x}
            y={bar.y}
            width={bar.barWidth}
            height={bar.barHeight}
            fill={CHART_CONFIG.COLORS.VOLUME}
            opacity="0.5"
          />
        ))}
      </svg>
    </div>
  );
};

export default StockChart;
