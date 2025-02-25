// /src/utils/csvLoader.js
import Papa from "papaparse";

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
