import React, { useMemo } from 'react';

const CHART_CONFIG = {
  WIDTH: 600,
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
    GRID: '#1a1a1a'
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

  // Memoize the parsed data
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

      // Pre-allocate array for better performance
      const result = new Array(lines.length - 1);
      let validCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const close = parseFloat(values[indices.close]);
        const open = parseFloat(values[indices.open]);
        const high = parseFloat(values[indices.high]);
        const low = parseFloat(values[indices.low]);
        const volume = parseFloat(values[indices.volume]);
        
        if (!isNaN(open) && !isNaN(high) && !isNaN(low) && !isNaN(close) && !isNaN(volume)) {
          result[validCount++] = {
            open,
            high,
            low,
            close,
            dollarVolume: close * volume,
            isUp: close >= open
          };
        }
      }

      return result.slice(0, validCount);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      return [];
    }
  }, [csvData]);

  const chartData = useMemo(() => {
    if (!data.length) return null;

    // Calculate ranges once
    const minPrice = Math.min(...data.map(d => d.low));
    const maxPrice = Math.max(...data.map(d => d.high));
    const maxDollarVolume = Math.max(...data.map(d => d.dollarVolume));
    const priceRange = maxPrice - minPrice;
    const paddedMinPrice = minPrice - (priceRange * 0.05);
    const paddedMaxPrice = maxPrice + (priceRange * 0.05);

    // Pre-calculate scales
    const priceScale = (CHART_CONFIG.PRICE_HEIGHT - (CHART_CONFIG.PADDING.top + CHART_CONFIG.PADDING.bottom)) / (paddedMaxPrice - paddedMinPrice);
    const volumeScale = (CHART_CONFIG.VOLUME_HEIGHT - CHART_CONFIG.PADDING.bottom) / maxDollarVolume;
    const spacing = CHART_CONFIG.BAR_WIDTH + CHART_CONFIG.BAR_PADDING;

    // Pre-calculate price ticks
    const step = (paddedMaxPrice - paddedMinPrice) / (CHART_CONFIG.PRICE_TICKS - 1);
    const priceTicks = Array.from({ length: CHART_CONFIG.PRICE_TICKS }, (_, i) => {
      const value = paddedMinPrice + (step * i);
      return {
        value,
        y: CHART_CONFIG.PRICE_HEIGHT - CHART_CONFIG.PADDING.bottom - 
           ((value - paddedMinPrice) * priceScale)
      };
    });

    // Transform data into drawing instructions in a single pass
    const bars = data.map((d, i) => ({
      x: CHART_CONFIG.PADDING.left + (i * spacing),
      highY: CHART_CONFIG.PRICE_HEIGHT - CHART_CONFIG.PADDING.bottom - ((d.high - paddedMinPrice) * priceScale),
      lowY: CHART_CONFIG.PRICE_HEIGHT - CHART_CONFIG.PADDING.bottom - ((d.low - paddedMinPrice) * priceScale),
      openY: CHART_CONFIG.PRICE_HEIGHT - CHART_CONFIG.PADDING.bottom - ((d.open - paddedMinPrice) * priceScale),
      closeY: CHART_CONFIG.PRICE_HEIGHT - CHART_CONFIG.PADDING.bottom - ((d.close - paddedMinPrice) * priceScale),
      volumeY: CHART_CONFIG.PRICE_HEIGHT + CHART_CONFIG.VOLUME_HEIGHT - CHART_CONFIG.PADDING.bottom - (d.dollarVolume * volumeScale),
      volumeHeight: d.dollarVolume * volumeScale,
      isUp: d.isUp,
      width: CHART_CONFIG.BAR_WIDTH
    }));

    return { bars, priceTicks };
  }, [data]);

  if (!chartData) return null;

  return (
    <div className="w-full h-full bg-black p-4">
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${CHART_CONFIG.WIDTH} ${CHART_CONFIG.PRICE_HEIGHT + CHART_CONFIG.VOLUME_HEIGHT}`}
        className="text-gray-400"
      >
        {/* Grid lines and price labels */}
        {chartData.priceTicks.map((tick, i) => (
          <g key={`price-${i}`}>
            <line
              x1={CHART_CONFIG.PADDING.left}
              y1={tick.y}
              x2={CHART_CONFIG.WIDTH - CHART_CONFIG.PADDING.right}
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

        {/* Stock bars and volume */}
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
            <rect
              x={bar.x}
              y={bar.volumeY}
              width={bar.width}
              height={bar.volumeHeight}
              fill={CHART_CONFIG.COLORS.VOLUME}
              opacity="0.8"
            />
          </g>
        ))}
      </svg>
    </div>
  );
};

export default StockChart;