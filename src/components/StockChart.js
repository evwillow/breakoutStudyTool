import React, { useMemo } from 'react';

const CHART_CONFIG = {
  // The following values remain for legacy reference, but our square chart will use the computed size.
  PRICE_HEIGHT: 500,
  VOLUME_HEIGHT: 100,
  PADDING: { left: 60, right: 20, top: 20, bottom: 30 },
  BAR_WIDTH: 6,
  BAR_PADDING: 2,
  PRICE_TICKS: 8,
  COLORS: {
    UP: '#00E676',
    DOWN: '#FF1744',
    VOLUME: '#29B6F6',
    GRID: '#1a1a1a',
    SMA10: '#e902f5', // Purple for 10 SMA
    SMA20: '#02ddf5'  // Bright vibrant blue for 20 SMA
  }
};

const StockChart = ({ csvData }) => {
  if (!csvData || typeof csvData !== 'string') {
    return (
      <div className="h-60 flex items-center justify-center text-gray-500">
        No data available
      </div>
    );
  }

  // Parse CSV data into an array of objects.
  const data = useMemo(() => {
    try {
      const lines = csvData.trim().split('\n');
      if (lines.length < 2) return [];
      
      const headers = lines[0].toLowerCase().split(',');
      const indices = {
        open: headers.findIndex(h => h.includes('open')),
        high: headers.findIndex(h => h.includes('high')),
        low: headers.findIndex(h => h.includes('low')),
        close: headers.findIndex(h => h.includes('close')),
        volume: headers.findIndex(h => h.includes('volume'))
      };

      const result = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const open = parseFloat(values[indices.open]);
        const high = parseFloat(values[indices.high]);
        const low = parseFloat(values[indices.low]);
        const close = parseFloat(values[indices.close]);
        // We ignore volume for our square chart.
        if (!isNaN(open) && !isNaN(high) && !isNaN(low) && !isNaN(close)) {
          result.push({
            open,
            high,
            low,
            close,
            isUp: close >= open
          });
        }
      }
      return result;
    } catch (error) {
      console.error('Error parsing CSV:', error);
      return [];
    }
  }, [csvData]);

  // Compute chart drawing data.
  const chartData = useMemo(() => {
    if (!data.length) return null;
    
    // Determine the price range.
    const minPrice = Math.min(...data.map(d => d.low));
    const maxPrice = Math.max(...data.map(d => d.high));
    const priceRange = maxPrice - minPrice;
    const paddedMinPrice = minPrice - (priceRange * 0.05);
    const paddedMaxPrice = maxPrice + (priceRange * 0.05);
    
    // Horizontal settings.
    const spacing = CHART_CONFIG.BAR_WIDTH + CHART_CONFIG.BAR_PADDING;
    // Compute the intrinsic width based on number of bars + 5 extra periods and add left/right padding.
    const intrinsicWidth = CHART_CONFIG.PADDING.left + ((data.length + 5) * spacing) + CHART_CONFIG.PADDING.right;
    // For a square chart, we force the height to equal the intrinsic width.
    const chartSize = intrinsicWidth;

    // Vertical scaling for prices.
    const priceScale = (chartSize - CHART_CONFIG.PADDING.top - CHART_CONFIG.PADDING.bottom) / (paddedMaxPrice - paddedMinPrice);

    // Grid tick marks.
    const step = (paddedMaxPrice - paddedMinPrice) / (CHART_CONFIG.PRICE_TICKS - 1);
    const priceTicks = Array.from({ length: CHART_CONFIG.PRICE_TICKS }, (_, i) => {
      const value = paddedMinPrice + (step * i);
      return {
        value,
        y: chartSize - CHART_CONFIG.PADDING.bottom - ((value - paddedMinPrice) * priceScale)
      };
    });

    // Candlestick bar instructions.
    const bars = data.map((d, i) => ({
      x: CHART_CONFIG.PADDING.left + (i * spacing),
      highY: chartSize - CHART_CONFIG.PADDING.bottom - ((d.high - paddedMinPrice) * priceScale),
      lowY: chartSize - CHART_CONFIG.PADDING.bottom - ((d.low - paddedMinPrice) * priceScale),
      openY: chartSize - CHART_CONFIG.PADDING.bottom - ((d.open - paddedMinPrice) * priceScale),
      closeY: chartSize - CHART_CONFIG.PADDING.bottom - ((d.close - paddedMinPrice) * priceScale),
      width: CHART_CONFIG.BAR_WIDTH,
      isUp: d.isUp
    }));

    // Helper: Calculate simple moving average for a given period.
    const calculateSMA = (period) => {
      return data.map((d, i) => {
        const start = i < period ? 0 : i - period + 1;
        const slice = data.slice(start, i + 1);
        const sum = slice.reduce((acc, cur) => acc + cur.close, 0);
        return sum / slice.length;
      });
    };

    const sma10Array = calculateSMA(10);
    const sma20Array = calculateSMA(20);

    // Convert SMA arrays into coordinate points.
    const sma10Points = sma10Array.map((avg, i) => {
      const x = CHART_CONFIG.PADDING.left + (i * spacing) + (CHART_CONFIG.BAR_WIDTH / 2);
      const y = chartSize - CHART_CONFIG.PADDING.bottom - ((avg - paddedMinPrice) * priceScale);
      return { x, y };
    });
    const sma20Points = sma20Array.map((avg, i) => {
      const x = CHART_CONFIG.PADDING.left + (i * spacing) + (CHART_CONFIG.BAR_WIDTH / 2);
      const y = chartSize - CHART_CONFIG.PADDING.bottom - ((avg - paddedMinPrice) * priceScale);
      return { x, y };
    });

    return { bars, priceTicks, chartSize, sma10Points, sma20Points };
  }, [data]);

  if (!chartData) return null;

  return (
    // The container will stretch to fill its parent; the SVG is set to 100%/100% with a square viewBox.
    <div className="bg-black p-0 w-full h-full">
      <svg 
        width="100%"
        height="100%"
        viewBox={`0 0 ${chartData.chartSize} ${chartData.chartSize}`}
        preserveAspectRatio="xMidYMid meet"
        className="text-gray-400"
      >
        {/* Draw grid lines and price labels */}
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
              fontSize="12"
              textAnchor="end"
              fill="white"
            >
              {tick.value.toFixed(2)}
            </text>
          </g>
        ))}

        {/* 10 SMA polyline (purple) */}
        <polyline
          fill="none"
          stroke={CHART_CONFIG.COLORS.SMA10}
          strokeWidth="2"
          points={chartData.sma10Points.map(p => `${p.x},${p.y}`).join(" ")}
        />

        {/* 20 SMA polyline (vibrant blue) */}
        <polyline
          fill="none"
          stroke={CHART_CONFIG.COLORS.SMA20}
          strokeWidth="2"
          points={chartData.sma20Points.map(p => `${p.x},${p.y}`).join(" ")}
        />

        {/* Render candlestick bars */}
        {chartData.bars.map((bar, i) => (
          <g key={`bar-${i}`}>
            {/* Vertical line (high-low) */}
            <line
              x1={bar.x + bar.width / 2}
              y1={bar.highY}
              x2={bar.x + bar.width / 2}
              y2={bar.lowY}
              stroke={bar.isUp ? CHART_CONFIG.COLORS.UP : CHART_CONFIG.COLORS.DOWN}
              strokeWidth="1"
            />
            {/* Open tick */}
            <line
              x1={bar.x}
              y1={bar.openY}
              x2={bar.x + bar.width / 2}
              y2={bar.openY}
              stroke={bar.isUp ? CHART_CONFIG.COLORS.UP : CHART_CONFIG.COLORS.DOWN}
              strokeWidth="1"
            />
            {/* Close tick */}
            <line
              x1={bar.x + bar.width / 2}
              y1={bar.closeY}
              x2={bar.x + bar.width}
              y2={bar.closeY}
              stroke={bar.isUp ? CHART_CONFIG.COLORS.UP : CHART_CONFIG.COLORS.DOWN}
              strokeWidth="1"
            />
          </g>
        ))}
      </svg>
    </div>
  );
};

export default StockChart;
