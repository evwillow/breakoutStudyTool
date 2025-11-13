/**
 * Data Processing Utilities
 * Handles flashcard data transformation and validation
 */

import { FILE_PATTERNS, GAME_CONFIG } from '../constants';
import type { FlashcardFile, FlashcardData, ProcessedFlashcardData } from '@breakout-study-tool/shared';

// Re-export for backward compatibility
export type { FlashcardFile, FlashcardData, ProcessedFlashcardData };

/**
 * Validates if a string is a proper UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Extracts and orders chart files (D.json, M.json)
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
      
      const fileName = file.fileName;
      const baseFileName = fileName.split('/').pop() || fileName; // Get just the filename part
      
      if (FILE_PATTERNS.DAILY.test(baseFileName)) {
        files.set("D", file);
      } else if (FILE_PATTERNS.MINUTE.test(baseFileName)) {
        files.set("M", file);
      }
      // H (hourly) files are no longer used - skip them
    }
    
    return ["D", "M"].map(key => files.get(key)).filter(Boolean) as FlashcardFile[];
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
    console.log("❌ No flashcard data or json files");
    return null;
  }

  console.log("🔍 Looking for after.json files:");
  console.log("📁 Folder:", flashcardData.name || flashcardData.folderName || 'unnamed');
  console.log("📄 All files:", flashcardData.jsonFiles.map(f => f.fileName));

  // Find the after.json file - check for exact match first, then partial
  // Also check for files that might be in the same stock directory
  let afterFile = flashcardData.jsonFiles.find(file => {
    const fileName = file.fileName.toLowerCase();
    const fileNameParts = fileName.split(/[/\\]/);
    const lastPart = fileNameParts[fileNameParts.length - 1];
    
    // Match: "after.json" or "stock_folder/after.json" or any path ending with after.json
    const isAfterFile = lastPart === 'after.json' || 
                       fileName.endsWith('/after.json') || 
                       fileName.endsWith('\\after.json') ||
                       (fileName.includes('after') && fileName.endsWith('.json'));
    
    console.log(`   - "${file.fileName}" (last part: "${lastPart}") is after file: ${isAfterFile}`);
    return isAfterFile;
  });
  
  // If not found, try case-insensitive search on the file name
  if (!afterFile) {
    afterFile = flashcardData.jsonFiles.find(file => {
      const fileName = file.fileName;
      const fileNameParts = fileName.split(/[/\\]/);
      const lastPart = fileNameParts[fileNameParts.length - 1]?.toLowerCase();
      return lastPart === 'after.json';
    });
    
    if (afterFile) {
      console.log("✅ Found after.json with case-insensitive search:", afterFile.fileName);
    }
  }
  
  if (!afterFile) {
    console.log("❌ No after.json file found");
    return null;
  }
  
  console.log("✅ Found after.json file:", afterFile.fileName);
  
  // Handle different after.json structures
  let afterData = afterFile.data;
  
  // Check if data has a 'value' property (wrapped format: { "value": [...], "Count": N })
  if (afterData && typeof afterData === 'object' && !Array.isArray(afterData)) {
    if ('value' in afterData && Array.isArray(afterData.value)) {
      console.log("📦 After.json has 'value' wrapper, extracting array");
      afterData = afterData.value;
    } else if (Array.isArray(Object.values(afterData)[0])) {
      // Handle case where first property is the array
      afterData = Object.values(afterData)[0];
      console.log("📦 After.json has nested structure, extracting first array property");
    }
  }
  
  // Basic validation - check if it's an array with data
  if (!Array.isArray(afterData) || afterData.length === 0) {
    console.log("❌ after.json data is not array or empty:", typeof afterData, afterData?.length);
    console.log("📊 After.json structure:", afterData);
    return null;
  }

  // Validate structure - ensure it has required price fields (case-insensitive)
  const firstPoint = afterData[0];
  const hasValidStructure = firstPoint && (
    (firstPoint.close || firstPoint.Close || firstPoint.CLOSE) ||
    (firstPoint.open || firstPoint.Open || firstPoint.OPEN)
  );
  
  if (!hasValidStructure) {
    console.log("⚠️ After.json data structure may be invalid - missing price fields");
    console.log("📊 First point:", firstPoint);
  }

  console.log("✅ after.json data is valid array with", afterData.length, "points");
  console.log("✅ Sample point:", firstPoint);
  console.log("✅ Returning after.json data");
  return afterData;
}

/**
 * Extracts and processes points.json data
 * Handles both formats:
 * - Array of strings: ["Higher Lows", "Cup and Handle", ...]
 * - Array of objects: [{ "points": "Higher Lows" }, { "points": "Cup and Handle" }, ...]
 */
export function extractPointsTextArray(flashcardData: FlashcardData | null): string[] {
  if (!flashcardData?.jsonFiles) {
    console.log("⚠️ No jsonFiles in flashcardData");
    return [];
  }
  
  console.log("🔍 Looking for points.json in:", flashcardData.jsonFiles.map(f => f.fileName.split('/').pop()));
  
  const pointsFile = flashcardData.jsonFiles.find(file => {
    const baseFileName = file.fileName.split('/').pop() || file.fileName;
    const matches = FILE_PATTERNS.POINTS.test(baseFileName);
    console.log(`  - "${file.fileName}" (last part: "${baseFileName}") matches points pattern: ${matches}`);
    return matches;
  });
  
  if (!pointsFile) {
    console.log("⚠️ points.json file not found. Available files:", flashcardData.jsonFiles.map(f => f.fileName));
    return [];
  }
  
  if (!pointsFile.data) {
    console.log("⚠️ points.json file exists but has no data");
    return [];
  }
  
  try {
    const jsonData = pointsFile.data;
    console.log("📊 Processing points.json, data type:", typeof jsonData, Array.isArray(jsonData) ? `array[${jsonData.length}]` : "object");
    
    // Handle array format
    if (Array.isArray(jsonData)) {
      const result = jsonData
        .map((item, idx) => {
          // If item is a string, return it directly
          if (typeof item === 'string') {
            return item;
          }
          // If item is an object with 'points' property
          if (typeof item === 'object' && item !== null) {
            // Check various possible property names
            const pointsValue = item.points || item.point || item.text || item.label || item.name;
            if (typeof pointsValue === 'string') {
              return pointsValue;
            }
            // If the object itself is a string-like structure, try to extract it
            if (typeof item === 'object' && Object.keys(item).length === 1) {
              const firstValue = Object.values(item)[0];
              if (typeof firstValue === 'string') {
                return firstValue;
              }
            }
          }
          return null;
        })
        .filter(Boolean) as string[];
      
      console.log("✅ Extracted points:", result);
      return result;
    }
    
    // Handle object format with 'value' wrapper
    if (typeof jsonData === 'object' && jsonData !== null && 'value' in jsonData && Array.isArray((jsonData as any).value)) {
      const valueArray = (jsonData as any).value;
      const result = valueArray
        .map((item: any) => {
          if (typeof item === 'string') {
            return item;
          }
          if (typeof item === 'object' && item !== null) {
            const pointsValue = item.points || item.point || item.text || item.label || item.name;
            if (typeof pointsValue === 'string') {
              return pointsValue;
            }
          }
          return null;
        })
        .filter(Boolean) as string[];
      
      console.log("✅ Extracted points from value wrapper:", result);
      return result;
    }
    
    console.log("⚠️ points.json has unexpected structure:", typeof jsonData);
    return [];
  } catch (error) {
    console.error("❌ Error processing points.json:", error);
    return [];
  }
}

/**
 * Processes all flashcard data and returns structured result
 */
export function processFlashcardData(flashcardData: FlashcardData | null): ProcessedFlashcardData {
  console.log("=== PROCESSING FLASHCARD DATA ===");
  console.log("Input flashcard data:", flashcardData);
  
  const orderedFiles = extractOrderedFiles(flashcardData);
  const afterJsonData = extractAfterJsonData(flashcardData);
  const pointsTextArray = extractPointsTextArray(flashcardData);
  
  console.log("Processed results:");
  console.log("- orderedFiles:", orderedFiles.length);
  console.log("- afterJsonData:", afterJsonData ? "exists" : "null");
  console.log("- pointsTextArray:", pointsTextArray);
  console.log("=== END PROCESSING ===");
  
  return {
    orderedFiles,
    afterJsonData,
    pointsTextArray,
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
    processed.orderedFiles.length > 0  // At least one of D.json or M.json
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