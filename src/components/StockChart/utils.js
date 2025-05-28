/**
 * StockChart Utilities
 * 
 * Common utility functions extracted from StockChart component
 * for better maintainability and reusability.
 */

/**
 * Flexible property access helper
 * @param {Object} item - Data item
 * @param {Array} props - Array of possible property names
 * @returns {number|null} - Parsed numeric value or null
 */
export const getPrice = (item, props) => {
  for (const prop of props) {
    if (item[prop] !== undefined && item[prop] !== null) {
      const val = parseFloat(item[prop]);
      return isNaN(val) ? null : val;
    }
  }
  return null;
};

/**
 * Get volume from data item with fallback properties
 * @param {Object} item - Data item
 * @returns {number|null} - Volume value or null
 */
export const getVolume = (item) => {
  const volumeProps = ['volume', 'Volume', 'VOLUME', 'vol', 'Vol', 'VOL'];
  return getPrice(item, volumeProps);
};

/**
 * Normalize OHLCV property names to lowercase
 * @param {Object} item - Data item
 * @returns {Object} - Normalized data item
 */
export const normalizeOHLCV = (item) => {
  const result = { ...item };
  
  // Normalize OHLCV property names to lowercase
  if ('Open' in item && !('open' in item)) result.open = item.Open;
  if ('High' in item && !('high' in item)) result.high = item.High;
  if ('Low' in item && !('low' in item)) result.low = item.Low;
  if ('Close' in item && !('close' in item)) result.close = item.Close;
  if ('Volume' in item && !('volume' in item)) result.volume = item.Volume;
  
  return result;
};

/**
 * Normalize SMA property names
 * @param {Object} item - Data item
 * @returns {Object} - Data item with normalized SMA properties
 */
export const normalizeSMA = (item) => {
  const result = { ...item };
  
  // SMA10 variants
  if (!('sma10' in result)) {
    const sma10Props = ['SMA10', 'ma10', 'MA10', 'ema10', 'EMA10', '10sma', '10SMA'];
    for (const prop of sma10Props) {
      if (prop in item) {
        result.sma10 = item[prop];
        break;
      }
    }
  }
  
  // SMA20 variants
  if (!('sma20' in result)) {
    const sma20Props = ['SMA20', 'ma20', 'MA20', 'ema20', 'EMA20', '20sma', '20SMA'];
    for (const prop of sma20Props) {
      if (prop in item) {
        result.sma20 = item[prop];
        break;
      }
    }
  }
  
  // SMA50 variants
  if (!('sma50' in result)) {
    const sma50Props = ['SMA50', 'ma50', 'MA50', 'ema50', 'EMA50', '50sma', '50SMA'];
    for (const prop of sma50Props) {
      if (prop in item) {
        result.sma50 = item[prop];
        break;
      }
    }
  }
  
  return result;
};

/**
 * Calculate SMA for a given period - Optimized version
 * @param {Array} data - Array of price data objects
 * @param {number} period - SMA period (10, 20, 50, etc.)
 * @param {string} priceKey - The key to use for price
 * @param {string} outputKey - The property name to use for the output
 * @returns {Array} - Array of data with SMA values added
 */
export const calculateSMA = (data, period, priceKey = 'close', outputKey = null) => {
  if (!Array.isArray(data) || data.length === 0 || period <= 0 || period >= data.length) {
    return data;
  }
  
  const actualOutputKey = outputKey || `sma${period}`;
  const result = data.map(item => ({ ...item }));
  
  // Possible price keys in order of preference
  const possiblePriceKeys = ['close', 'Close', 'CLOSE', 'price', 'Price', 'PRICE'];
  const priceKeys = priceKey ? [priceKey] : possiblePriceKeys;
  
  // Precalculate all numeric prices
  const numericPrices = result.map(item => getPrice(item, priceKeys));
  
  // Calculate SMA for each point
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
    
    // Only calculate SMA if we have at least 80% of valid data points
    if (validPoints >= period * 0.8) {
      result[i][actualOutputKey] = sum / validPoints;
    } else {
      result[i][actualOutputKey] = null;
    }
  }
  
  return result;
};

/**
 * Check if SMA data exists in the dataset
 * @param {Array} data - Array of data points
 * @param {number} period - SMA period
 * @returns {boolean} - True if SMA data exists
 */
export const hasSMAData = (data, period) => {
  const smaKey = `sma${period}`;
  return data.some(d => d[smaKey] !== null && d[smaKey] !== undefined);
};

/**
 * Get SMA display configuration for chart type
 * @param {string} chartType - Chart type (hourly, monthly, etc.)
 * @returns {Object} - SMA display configuration
 */
export const getSMAConfig = (chartType) => {
  const config = {
    showSMA10: true,
    showSMA20: true,
    showSMA50: true
  };
  
  // For hourly charts, only display SMA10 and SMA20
  if (chartType === 'hourly' || chartType === 'H') {
    config.showSMA50 = false;
  }
  // For monthly/minute charts, don't display any SMAs
  else if (chartType === 'monthly' || chartType === 'M' || chartType === 'minute') {
    config.showSMA10 = false;
    config.showSMA20 = false;
    config.showSMA50 = false;
  }
  
  return config;
};

/**
 * Parse JSON data if it exists in a 'json' property
 * @param {Object} item - Data item
 * @returns {Object} - Parsed data item
 */
export const parseJSONData = (item) => {
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
}; 