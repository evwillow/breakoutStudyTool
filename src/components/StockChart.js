import React, { useMemo } from 'react';

const CHART_CONFIG = {
  PRICE_HEIGHT: 500, // legacy reference value
  VOLUME_HEIGHT: 100, // legacy reference value
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

  // Parse CSV data into an array of stock objects.
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
        const volume = parseFloat(values[indices.volume]);
        if (!isNaN(open) && !isNaN(high) && !isNaN(low) && !isNaN(close) && !isNaN(volume)) {
          result.push({
            open,
            high,
            low,
            close,
            dollarVolume: close * volume,
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

  // Compute chart data in a square viewBox.
  const chartData = useMemo(() => {
    if (!data.length) return null;

    // Price range calculations.
    const minPrice = Math.min(...data.map(d => d.low));
    const maxPrice = Math.max(...data.map(d => d.high));
    const maxDollarVolume = Math.max(...data.map(d => d.dollarVolume));
    const priceRange = maxPrice - minPrice;
    const paddedMinPrice = minPrice - (priceRange * 0.05);
    const paddedMaxPrice = maxPrice + (priceRange * 0.05);

    // Horizontal spacing.
    const spacing = CHART_CONFIG.BAR_WIDTH + CHART_CONFIG.BAR_PADDING;
    // Compute intrinsic width: number of bars plus five extra periods plus left/right padding.
    const intrinsicWidth = CHART_CONFIG.PADDING.left + ((data.length + 5) * spacing) + CHART_CONFIG.PADDING.right;
    const chartSize = intrinsicWidth; // square chart

    // Vertical areas: 75% for price, 25% for volume.
    const priceAreaHeight = chartSize * 0.75;
    const volumeAreaHeight = chartSize * 0.25;

    // Price scale: map [paddedMinPrice, paddedMaxPrice] to [priceAreaHeight - PADDING.top, 0]
    const priceScale = (priceAreaHeight - CHART_CONFIG.PADDING.top) / (paddedMaxPrice - paddedMinPrice);
    // Volume scale: map [0, maxDollarVolume] to [0, volumeAreaHeight - PADDING.bottom]
    const volumeScale = (volumeAreaHeight - CHART_CONFIG.PADDING.bottom) / maxDollarVolume;

    // Price grid ticks.
    const step = (paddedMaxPrice - paddedMinPrice) / (CHART_CONFIG.PRICE_TICKS - 1);
    const priceTicks = Array.from({ length: CHART_CONFIG.PRICE_TICKS }, (_, i) => {
      const value = paddedMinPrice + (step * i);
      return {
        value,
        y: CHART_CONFIG.PADDING.top + (paddedMaxPrice - value) * priceScale
      };
    });

    // Candlestick bars (price area).
    const bars = data.map((d, i) => ({
      x: CHART_CONFIG.PADDING.left + i * spacing,
      openY: CHART_CONFIG.PADDING.top + (paddedMaxPrice - d.open) * priceScale,
      closeY: CHART_CONFIG.PADDING.top + (paddedMaxPrice - d.close) * priceScale,
      highY: CHART_CONFIG.PADDING.top + (paddedMaxPrice - d.high) * priceScale,
      lowY: CHART_CONFIG.PADDING.top + (paddedMaxPrice - d.low) * priceScale,
      width: CHART_CONFIG.BAR_WIDTH,
      isUp: d.isUp,
      volume: d.dollarVolume
    }));

    // SMA calculations.
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

    // Convert SMA arrays into coordinate points (in the price area).
    const sma10Points = sma10Array.map((avg, i) => {
      const x = CHART_CONFIG.PADDING.left + i * spacing + (CHART_CONFIG.BAR_WIDTH / 2);
      const y = CHART_CONFIG.PADDING.top + (paddedMaxPrice - avg) * priceScale;
      return { x, y };
    });
    const sma20Points = sma20Array.map((avg, i) => {
      const x = CHART_CONFIG.PADDING.left + i * spacing + (CHART_CONFIG.BAR_WIDTH / 2);
      const y = CHART_CONFIG.PADDING.top + (paddedMaxPrice - avg) * priceScale;
      return { x, y };
    });

    // Volume bars (in the volume area, which starts at y = priceAreaHeight).
    const volumeBars = data.map((d, i) => ({
      x: CHART_CONFIG.PADDING.left + i * spacing,
      barWidth: CHART_CONFIG.BAR_WIDTH,
      barHeight: d.dollarVolume * volumeScale,
      y: chartSize - CHART_CONFIG.PADDING.bottom - (d.dollarVolume * volumeScale)
    }));

    return { bars, priceTicks, volumeBars, chartSize, sma10Points, sma20Points };
  }, [data]);

  if (!chartData) return null;

  return (
    // The SVG fills its container; its viewBox is square.
    <div className="bg-black w-full h-full">
      <svg 
        width="100%"
        height="100%"
        viewBox={`0 0 ${chartData.chartSize} ${chartData.chartSize}`}
        preserveAspectRatio="xMidYMid meet"
        className="text-gray-400"
      >
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
              fontSize="12"
              textAnchor="end"
              fill="white"
            >
              {tick.value.toFixed(2)}
            </text>
          </g>
        ))}

        {/* Draw SMA lines */}
        <polyline
          fill="none"
          stroke={CHART_CONFIG.COLORS.SMA10}
          strokeWidth="2"
          points={chartData.sma10Points.map(p => `${p.x},${p.y}`).join(" ")}
        />
        <polyline
          fill="none"
          stroke={CHART_CONFIG.COLORS.SMA20}
          strokeWidth="2"
          points={chartData.sma20Points.map(p => `${p.x},${p.y}`).join(" ")}
        />

        {/* Draw candlestick bars */}
        {chartData.bars.map((bar, i) => (
          <g key={`bar-${i}`}>
            <line
              x1={bar.x + bar.width / 2}
              y1={bar.highY}
              x2={bar.x + bar.width / 2}
              y2={bar.lowY}
              stroke={bar.isUp ? CHART_CONFIG.COLORS.UP : CHART_CONFIG.COLORS.DOWN}
              strokeWidth="1"
            />
            <line
              x1={bar.x}
              y1={bar.openY}
              x2={bar.x + bar.width / 2}
              y2={bar.openY}
              stroke={bar.isUp ? CHART_CONFIG.COLORS.UP : CHART_CONFIG.COLORS.DOWN}
              strokeWidth="1"
            />
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

        {/* Draw volume bars */}
        {chartData.volumeBars.map((vol, i) => (
          <rect
            key={`vol-${i}`}
            x={vol.x}
            y={vol.y}
            width={vol.barWidth}
            height={vol.barHeight}
            fill={CHART_CONFIG.COLORS.VOLUME}
            opacity="0.8"
          />
        ))}
      </svg>
    </div>
  );
};

export default StockChart;
