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
    return null;
  }
  
  const afterFile = flashcardData.jsonFiles.find(file =>
    FILE_PATTERNS.AFTER.test(file.fileName.toLowerCase())
  );
  
  return afterFile?.data || null;
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
  
  const processed = processFlashcardData(flashcardData);
  
  return (
    processed.orderedFiles.length === GAME_CONFIG.REQUIRED_FILES.length &&
    processed.thingData.length > 0
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