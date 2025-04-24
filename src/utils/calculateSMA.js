const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

/**
 * Calculate Simple Moving Average (SMA) for a given period
 * @param {Array} data - Array of price data points
 * @param {number} period - Period for SMA calculation
 * @param {string} priceField - Field to use for calculation (e.g., 'Close')
 * @returns {Array} - Array of SMA values with the same length as data (first period-1 values are null)
 */
function calculateSMA(data, period, priceField = 'Close') {
  const smaValues = [];
  
  // Fill initial values with null
  for (let i = 0; i < period - 1; i++) {
    smaValues.push(null);
  }
  
  // Calculate SMA for the rest
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += parseFloat(data[i - j][priceField]);
    }
    smaValues.push(sum / period);
  }
  
  return smaValues;
}

/**
 * Process CSV file to add SMA columns
 * @param {string} inputFile - Path to input CSV file
 * @param {string} outputFile - Path to output CSV file
 */
function addSMAtoCSV(inputFile, outputFile) {
  try {
    // Read the CSV file
    const csvData = fs.readFileSync(inputFile, 'utf8');
    
    // Parse the CSV
    const parsedData = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true
    });
    
    if (!parsedData.data || parsedData.data.length === 0) {
      console.error('No data found in the CSV file');
      return;
    }
    
    // Calculate SMAs
    const sma10 = calculateSMA(parsedData.data, 10);
    const sma20 = calculateSMA(parsedData.data, 20);
    const sma50 = calculateSMA(parsedData.data, 50);
    
    // Add SMA values to the data
    const enhancedData = parsedData.data.map((row, index) => {
      return {
        ...row,
        '10sma': sma10[index] !== null ? sma10[index].toFixed(10) : '',
        '20sma': sma20[index] !== null ? sma20[index].toFixed(10) : '',
        '50sma': sma50[index] !== null ? sma50[index].toFixed(10) : ''
      };
    });
    
    // Convert back to CSV
    const outputCSV = Papa.unparse(enhancedData);
    
    // Write to output file
    fs.writeFileSync(outputFile, outputCSV);
    
    console.log(`Successfully added SMA columns to ${outputFile}`);
  } catch (error) {
    console.error('Error processing CSV file:', error);
  }
}

// Process the hourly chart data
const inputFile = path.join(process.cwd(), 'data', 'original', 'SLOT_Apr_14_2001', 'H.csv');
const outputFile = path.join(process.cwd(), 'data', 'original', 'SLOT_Apr_14_2001', 'H_with_SMA.csv');

addSMAtoCSV(inputFile, outputFile);

module.exports = {
  calculateSMA,
  addSMAtoCSV
}; 