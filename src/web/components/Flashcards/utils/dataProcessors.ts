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
      
      const fileName = file.fileName;
      const baseFileName = fileName.split('/').pop() || fileName; // Get just the filename part
      
      if (FILE_PATTERNS.DAILY.test(baseFileName)) {
        files.set("D", file);
      } else if (FILE_PATTERNS.HOURLY.test(baseFileName)) {
        files.set("H", file);
      } else if (FILE_PATTERNS.MINUTE.test(baseFileName)) {
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
    console.log("❌ No flashcard data or json files");
    return null;
  }

  console.log("🔍 Looking for after.json files:");
  console.log("📁 Folder:", flashcardData.name || flashcardData.folderName || 'unnamed');
  console.log("📄 All files:", flashcardData.jsonFiles.map(f => f.fileName));

  // Find the after.json file
  const afterFile = flashcardData.jsonFiles.find(file => {
    const fileName = file.fileName;
    const isAfterFile = fileName.endsWith('/after.json') || fileName.includes('after') && fileName.endsWith('.json');
    console.log(`   - "${file.fileName}" is after file: ${isAfterFile}`);
    return isAfterFile;
  });
  
  if (!afterFile) {
    console.log("❌ No after.json file found");
    return null;
  }
  
  console.log("✅ Found after.json file:", afterFile.fileName);
  
  // Basic validation - just check if it's an array with data
  if (!Array.isArray(afterFile.data) || afterFile.data.length === 0) {
    console.log("❌ after.json data is not array or empty:", typeof afterFile.data, afterFile.data?.length);
    return null;
  }

  console.log("✅ after.json data is valid array with", afterFile.data.length, "points");
  console.log("✅ Returning after.json data");
  return afterFile.data;
}

/**
 * Extracts and processes thing.json data
 */
export function extractThingData(flashcardData: FlashcardData | null): number[] {
  if (!flashcardData?.jsonFiles) {
    return [];
  }
  
  const thingFile = flashcardData.jsonFiles.find(file => {
    const baseFileName = file.fileName.split('/').pop() || file.fileName;
    return FILE_PATTERNS.THING.test(baseFileName);
  });
  
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
  
  const pointsFile = flashcardData.jsonFiles.find(file => {
    const baseFileName = file.fileName.split('/').pop() || file.fileName;
    return FILE_PATTERNS.POINTS.test(baseFileName);
  });
  
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
  console.log("=== PROCESSING FLASHCARD DATA ===");
  console.log("Input flashcard data:", flashcardData);
  
  const orderedFiles = extractOrderedFiles(flashcardData);
  const afterJsonData = extractAfterJsonData(flashcardData);
  const thingData = extractThingData(flashcardData);
  const pointsTextArray = extractPointsTextArray(flashcardData);
  
  console.log("Processed results:");
  console.log("- orderedFiles:", orderedFiles.length);
  console.log("- afterJsonData:", afterJsonData ? "exists" : "null");
  console.log("- thingData:", thingData);
  console.log("- pointsTextArray:", pointsTextArray);
  console.log("=== END PROCESSING ===");
  
  return {
    orderedFiles,
    afterJsonData,
    thingData,
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