// /src/utils/csvLoader.js
import Papa from "papaparse";

/**
 * CSV Loader Utility
 * 
 * Provides functionality for loading and parsing CSV files.
 * Uses the PapaParse library for reliable CSV parsing.
 * Designed for simple CSV files with one value per row.
 */

/**
 * Loads a CSV file from the given URL and parses it.
 * Assumes a simple CSV with one value per row.
 *
 * @param {string} url - The URL of the CSV file.
 * @returns {Promise<any[]>} - An array of values (strings or numbers).
 */
export async function loadCSV(url) {
  const response = await fetch(url);
  const csvText = await response.text();
  const results = Papa.parse(csvText, { header: false });
  return results.data.map((row) => row[0]).filter((val) => val !== undefined && val !== null);
}
