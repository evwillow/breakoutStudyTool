import type { ChartType, ProcessedStockDataPoint } from '@/components/StockChart/StockChart.types';

/**
 * Type guard to check if data is an array of stock data points
 */
function isStockDataArray(data: unknown): data is ProcessedStockDataPoint[] {
  return Array.isArray(data) && data.length > 0;
}

export const calculateSMA = (
  data: ProcessedStockDataPoint[],
  period: number,
  priceKey: string | null = null,
  outputKey: string | null = null
): ProcessedStockDataPoint[] => {
  if (!Array.isArray(data) || data.length === 0) {
    console.warn('Cannot calculate SMA: Invalid or empty data array');
    return data;
  }

  if (period <= 0 || period >= data.length) {
    console.warn(`Cannot calculate SMA: Invalid period ${period} for data length ${data.length}`);
    return data;
  }

  const actualOutputKey = outputKey || `sma${period}`;
  const result: ProcessedStockDataPoint[] = data.map(item => ({ ...item }));

  const getPrice = (item: ProcessedStockDataPoint, props: string[]): number | null => {
    for (const prop of props) {
      if (item[prop] !== undefined && item[prop] !== null) {
        const val = parseFloat(String(item[prop]));
        return isNaN(val) ? null : val;
      }
    }
    return null;
  };

  const firstItem = result[0];
  const possiblePriceKeys = [
    'close',
    'Close',
    'CLOSE',
    'price',
    'Price',
    'PRICE',
    'last',
    'Last',
    'LAST',
  ];

  let actualPriceKey: string | null = priceKey;
  if (!actualPriceKey) {
    for (const key of possiblePriceKeys) {
      if (key in firstItem && firstItem[key] !== null && firstItem[key] !== undefined) {
        actualPriceKey = key;
        break;
      }
    }
  }

  if (!actualPriceKey) {
    console.error('No valid price key found in data');
    return data;
  }

  const numericPrices: (number | null)[] = result.map(item => {
    const price = priceKey ? getPrice(item, [priceKey]) : getPrice(item, possiblePriceKeys);
    return price;
  });

  for (let i = 0; i < result.length; i++) {
    if (i < period - 1) {
      result[i][actualOutputKey] = null;
      continue;
    }

    let sum = 0;
    let validPoints = 0;

    for (let j = 0; j < period; j++) {
      const price = numericPrices[i - j];
      if (price !== null && !isNaN(price)) {
        sum += price;
        validPoints++;
      }
    }

    if (validPoints >= period * 0.8) {
      const sma = sum / validPoints;
      result[i][actualOutputKey] = sma;
    } else {
      result[i][actualOutputKey] = null;
    }
  }

  let validSMACount = 0;
  result.forEach(item => {
    if (
      item[actualOutputKey] !== null &&
      item[actualOutputKey] !== undefined &&
      !isNaN(Number(item[actualOutputKey]))
    ) {
      validSMACount++;
    }
  });

  return result;
};

export const processChartData = (
  chartData: unknown,
  chartType: ChartType
): ProcessedStockDataPoint[] => {
  if (!isStockDataArray(chartData)) {
    console.warn('Invalid chart data:', chartData);
    return [];
  }

  let processedData: ProcessedStockDataPoint[] = chartData.map((item: ProcessedStockDataPoint) => ({
    ...item,
  }));

  // Hourly chart SMA detection (logging removed)

  processedData = processedData.map(item => {
    if (item.json && typeof item.json === 'string') {
      try {
        const parsedJson = JSON.parse(item.json);
        return { ...item, ...parsedJson };
      } catch (err) {
        console.error('Error parsing JSON data:', err);
        return item;
      }
    }
    return item;
  });

  const samplePoint = processedData[0];

  const hasSMA10Data =
    'sma10' in samplePoint ||
    'SMA10' in samplePoint ||
    'ma10' in samplePoint ||
    'MA10' in samplePoint ||
    '10sma' in samplePoint;
  const hasSMA20Data =
    'sma20' in samplePoint ||
    'SMA20' in samplePoint ||
    'ma20' in samplePoint ||
    'MA20' in samplePoint ||
    '20sma' in samplePoint;
  const hasSMA50Data =
    'sma50' in samplePoint ||
    'SMA50' in samplePoint ||
    'ma50' in samplePoint ||
    'MA50' in samplePoint ||
    '50sma' in samplePoint;

  processedData = processedData.map(item => {
    const result: ProcessedStockDataPoint = { ...item };

    if ('Open' in item && !('open' in item)) result.open = item.Open as number;
    if ('High' in item && !('high' in item)) result.high = item.High as number;
    if ('Low' in item && !('low' in item)) result.low = item.Low as number;
    if ('Close' in item && !('close' in item)) result.close = item.Close as number;
    if ('Volume' in item && !('volume' in item)) result.volume = item.Volume as number;

    if (!('sma10' in result)) {
      if ('SMA10' in item) result.sma10 = item.SMA10 as number | null;
      else if ('ma10' in item) result.sma10 = item.ma10 as number | null;
      else if ('MA10' in item) result.sma10 = item.MA10 as number | null;
      else if ('ema10' in item) result.sma10 = item.ema10 as number | null;
      else if ('EMA10' in item) result.sma10 = item.EMA10 as number | null;
      else if ('10sma' in item) result.sma10 = item['10sma'] as number | null;
      else if ('10SMA' in item) result.sma10 = item['10SMA'] as number | null;
    }

    if (!('sma20' in result)) {
      if ('SMA20' in item) result.sma20 = item.SMA20 as number | null;
      else if ('ma20' in item) result.sma20 = item.ma20 as number | null;
      else if ('MA20' in item) result.sma20 = item.MA20 as number | null;
      else if ('ema20' in item) result.sma20 = item.ema20 as number | null;
      else if ('EMA20' in item) result.sma20 = item.EMA20 as number | null;
      else if ('20sma' in item) result.sma20 = item['20sma'] as number | null;
      else if ('20SMA' in item) result.sma20 = item['20SMA'] as number | null;
    }

    if (!('sma50' in result)) {
      if ('SMA50' in item) result.sma50 = item.SMA50 as number | null;
      else if ('ma50' in item) result.sma50 = item.ma50 as number | null;
      else if ('MA50' in item) result.sma50 = item.MA50 as number | null;
      else if ('ema50' in item) result.sma50 = item.ema50 as number | null;
      else if ('EMA50' in item) result.sma50 = item.EMA50 as number | null;
      else if ('50sma' in item) result.sma50 = item['50sma'] as number | null;
      else if ('50SMA' in item) result.sma50 = item['50SMA'] as number | null;
    }

    return result;
  });

  const hasSMA10 = processedData.some(
    d => d.sma10 !== null && d.sma10 !== undefined && !isNaN(Number(d.sma10))
  );
  const hasSMA20 = processedData.some(
    d => d.sma20 !== null && d.sma20 !== undefined && !isNaN(Number(d.sma20))
  );
  const hasSMA50 = processedData.some(
    d => d.sma50 !== null && d.sma50 !== undefined && !isNaN(Number(d.sma50))
  );

  if (chartType === 'hourly' || chartType === 'H') {
    if (!hasSMA10) {
      calculateSMA(processedData, 10, 'close', 'sma10');
    }
    if (!hasSMA20) {
      calculateSMA(processedData, 20, 'close', 'sma20');
    }
  }

  if (!hasSMA10 && (chartType !== 'monthly' && chartType !== 'M')) {
    calculateSMA(processedData, 10, 'close', 'sma10');
  }

  if (!hasSMA20 && (chartType !== 'monthly' && chartType !== 'M')) {
    calculateSMA(processedData, 20, 'close', 'sma20');
  }

  if (
    !hasSMA50 &&
    chartType !== 'monthly' &&
    chartType !== 'M' &&
    chartType !== 'hourly' &&
    chartType !== 'H'
  ) {
    calculateSMA(processedData, 50, 'close', 'sma50');
  }

  let showSMA10 = true;
  let showSMA20 = true;
  let showSMA50 = true;

  if (chartType === 'hourly' || chartType === 'H') {
    showSMA10 = true;
    showSMA20 = true;
    showSMA50 = false;
  } else if (chartType === 'monthly' || chartType === 'M' || chartType === 'minute') {
    showSMA10 = false;
    showSMA20 = false;
    showSMA50 = false;
  }

  processedData = processedData.map(item => {
    const result: ProcessedStockDataPoint = { ...item };

    if (!showSMA10) result.sma10 = null;
    if (!showSMA20) result.sma20 = null;
    if (!showSMA50) result.sma50 = null;

    return result;
  });

  return processedData;
};

