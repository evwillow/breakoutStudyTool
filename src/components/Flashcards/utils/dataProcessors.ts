/**
 * Data Processing Utilities
 * Handles flashcard data transformation and validation
 */

import { FILE_PATTERNS, GAME_CONFIG } from '../constants';

export interface FlashcardFile {
  fileName: string;
  data: any;
}

export interface FlashcardData {
  name?: string;
  folderName?: string;
  jsonFiles: FlashcardFile[];
}

export interface ProcessedFlashcardData {
  orderedFiles: FlashcardFile[];
  afterJsonData: any;
  thingData: number[];
  pointsTextArray: string[];
}

/**
 * Validates if a string is a proper UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Extracts and orders chart files (D.json, H.json, M.json)
 */
export function extractOrderedFiles(flashcardData: FlashcardData | null): FlashcardFile[] {
  if (!flashcardData?.jsonFiles) {
    return [];
  }

  try {
    const files = new Map<string, FlashcardFile>();
    
    for (const file of flashcardData.jsonFiles) {
      if (!file.fileName || !file.data) {
        continue;
      }
      
      const fileName = file.fileName.toLowerCase();
      
      if (FILE_PATTERNS.DAILY.test(fileName)) {
        files.set("D", file);
      } else if (FILE_PATTERNS.HOURLY.test(fileName)) {
        files.set("H", file);
      } else if (FILE_PATTERNS.MINUTE.test(fileName)) {
        files.set("M", file);
      }
    }
    
    return ["D", "H", "M"].map(key => files.get(key)).filter(Boolean) as FlashcardFile[];
  } catch (error) {
    console.error("Error processing ordered files:", error);
    return [];
  }
}

/**
 * Extracts after.json data for chart visualization
 */
export function extractAfterJsonData(flashcardData: FlashcardData | null): any {
  if (!flashcardData?.jsonFiles) {
    console.error("❌ PROBLEM: No flashcard data or json files");
    return null;
  }

  console.error("🔍 DEBUGGING AFTER.JSON SEARCH:");
  console.error("📁 Folder:", flashcardData.name || flashcardData.folderName || 'unnamed');
  console.error("📄 All files in folder:", flashcardData.jsonFiles.map(f => f.fileName));

  // Find the after.json file in this specific folder
  const afterFiles = flashcardData.jsonFiles.filter(file => {
    const matches = FILE_PATTERNS.AFTER.test(file.fileName.toLowerCase());
    console.error(`   - "${file.fileName}" matches /after\.json$/i: ${matches}`);
    return matches;
  });
  
  // Also check for common variations
  if (afterFiles.length === 0) {
    console.error("🔍 No exact matches, checking variations...");
    const possibleAfterFiles = flashcardData.jsonFiles.filter(file => {
      const fileName = file.fileName.toLowerCase();
      const isAfterFile = fileName.includes('after') && fileName.endsWith('.json');
      console.error(`   - "${file.fileName}" contains 'after' and ends with '.json': ${isAfterFile}`);
      return isAfterFile;
    });
    
    if (possibleAfterFiles.length > 0) {
      console.error("✅ Found variations:", possibleAfterFiles.map(f => f.fileName));
      afterFiles.push(...possibleAfterFiles);
    }
  }
  
  if (afterFiles.length === 0) {
    console.error("❌ PROBLEM: No after.json files found at all");
    return null;
  }
  
  const afterFile = afterFiles[0];
  console.error("✅ Found after.json file:", afterFile.fileName);
  
  // Get D.json file for comparison
  const dFile = flashcardData.jsonFiles.find(file =>
    FILE_PATTERNS.DAILY.test(file.fileName.toLowerCase())
  );
  console.error("📄 D.json file:", dFile ? dFile.fileName : "NOT FOUND");
  
  // Validate that the data is actually stock/chart data
  if (!Array.isArray(afterFile.data) || afterFile.data.length === 0) {
    console.error("❌ PROBLEM: after.json data is not array or empty:", typeof afterFile.data, afterFile.data?.length);
    return null;
  }

  console.error("📊 after.json data length:", afterFile.data.length);

  const firstPoint = afterFile.data[0];
  const hasRequiredFields = ['open', 'high', 'low', 'close', 'volume'].some(field => 
    firstPoint.hasOwnProperty(field) || firstPoint.hasOwnProperty(field.charAt(0).toUpperCase() + field.slice(1))
  );
  
  if (!hasRequiredFields) {
    console.error("❌ PROBLEM: after.json missing required OHLCV fields:", firstPoint);
    return null;
  }
  
  console.error("✅ after.json has valid OHLCV fields");
  
  // CRITICAL: Compare after data with D.json to ensure they're different
  if (dFile && Array.isArray(dFile.data) && dFile.data.length > 0) {
    console.error("🔍 Comparing after.json with D.json...");
    const originalData = dFile.data;
    console.error("📊 D.json data length:", originalData.length, "vs after.json:", afterFile.data.length);
    
    const comparePoints = Math.min(3, originalData.length, afterFile.data.length);
    let identicalCount = 0;
    
    for (let i = 0; i < comparePoints; i++) {
      const orig = originalData[i];
      const after = afterFile.data[i];
      
      // Compare key fields
      const closeMatch = Math.abs((orig.close || orig.Close || 0) - (after.close || after.Close || 0)) < 0.01;
      const dateMatch = (orig.date || orig.Date) === (after.date || after.Date);
      
      console.error(`   Point ${i}: close match=${closeMatch}, date match=${dateMatch}`);
      console.error(`   D.json: close=${orig.close || orig.Close}, date=${orig.date || orig.Date}`);
      console.error(`   after.json: close=${after.close || after.Close}, date=${after.date || after.Date}`);
      
      if (closeMatch && dateMatch) {
        identicalCount++;
      }
    }
    
    console.error(`🎯 Comparison result: ${identicalCount} of ${comparePoints} points identical`);
    
    // If all compared points are identical, don't return the data
    if (identicalCount === comparePoints) {
      console.error("❌ PROBLEM: after.json data is IDENTICAL to D.json - rejecting");
      return null; // Don't return identical data
    } else {
      console.error("✅ after.json data is DIFFERENT from D.json - accepting");
    }
  } else {
    console.error("⚠️ WARNING: No D.json file to compare with");
  }
  
  console.error("✅ Returning after.json data");
  return afterFile.data;
}

/**
 * Extracts and processes thing.json data
 */
export function extractThingData(flashcardData: FlashcardData | null): number[] {
  if (!flashcardData?.jsonFiles) {
    return [];
  }
  
  const thingFile = flashcardData.jsonFiles.find(file =>
    FILE_PATTERNS.THING.test(file.fileName.toLowerCase())
  );
  
  if (!thingFile?.data) {
    return [];
  }
  
  try {
    const jsonData = thingFile.data;
    
    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      return [];
    }
    
    const thingValue = jsonData[0].thing;
    
    if (typeof thingValue !== 'number') {
      return [];
    }
    
    return [thingValue];
  } catch (error) {
    console.error("Error processing thing.json:", error);
    return [];
  }
}

/**
 * Extracts and processes points.json data
 */
export function extractPointsTextArray(flashcardData: FlashcardData | null): string[] {
  if (!flashcardData?.jsonFiles) {
    return [];
  }
  
  const pointsFile = flashcardData.jsonFiles.find(file =>
    FILE_PATTERNS.POINTS.test(file.fileName.toLowerCase())
  );
  
  if (!pointsFile?.data) {
    return [];
  }
  
  try {
    const jsonData = pointsFile.data;
    
    if (!Array.isArray(jsonData)) {
      return [];
    }
    
    return jsonData
      .map(item => typeof item.points === 'string' ? item.points : null)
      .filter(Boolean) as string[];
  } catch (error) {
    console.error("Error processing points.json:", error);
    return [];
  }
}

/**
 * Processes all flashcard data and returns structured result
 */
export function processFlashcardData(flashcardData: FlashcardData | null): ProcessedFlashcardData {
  return {
    orderedFiles: extractOrderedFiles(flashcardData),
    afterJsonData: extractAfterJsonData(flashcardData),
    thingData: extractThingData(flashcardData),
    pointsTextArray: extractPointsTextArray(flashcardData),
  };
}

/**
 * Validates if flashcard data has all required files
 */
export function validateFlashcardData(flashcardData: FlashcardData | null): boolean {
  if (!flashcardData?.jsonFiles) {
    return false;
  }
  
  // Check if we have at least some JSON files
  if (!flashcardData.jsonFiles.length) {
    return false;
  }
  
  const processed = processFlashcardData(flashcardData);
  
  // More lenient validation - require at least one chart file instead of all three
  // This matches the behavior before the refactoring
  return (
    processed.orderedFiles.length > 0  // At least one of D.json, H.json, or M.json
    // Removed the strict requirement for thing.json data as it's optional
  );
}

/**
 * Extracts stock name from flashcard data
 */
export function extractStockName(flashcardData: FlashcardData | null): string | null {
  if (!flashcardData) {
    return null;
  }
  
  // Try multiple sources for the stock name
  if (flashcardData.name) {
    return flashcardData.name;
  }
  
  if (flashcardData.folderName) {
    return flashcardData.folderName;
  }
  
  // Extract from first file name
  if (flashcardData.jsonFiles?.[0]?.fileName) {
    const fileName = flashcardData.jsonFiles[0].fileName;
    const stockName = fileName.split('_')[0];
    return stockName || null;
  }
  
  return null;
}

/**
 * Detects if the current device is mobile
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  return window.innerWidth < GAME_CONFIG.MOBILE_BREAKPOINT || 'ontouchstart' in window;
} 