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
 * Extracts and processes thing.json data
 * Supports both old format (array with 'thing' property) and new format (object with 'Log Sale Price')
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
    
    // Handle object format with 'value' array (e.g., { "value": [{ "thing": 2 }] })
    if (typeof jsonData === 'object' && jsonData !== null && !Array.isArray(jsonData)) {
      // Check if there's a 'value' property with an array
      if ('value' in jsonData && Array.isArray((jsonData as any).value) && (jsonData as any).value.length > 0) {
        const firstItem = (jsonData as any).value[0];
        
        // Look for 'Log Sale Price' field first (primary field)
        const logSalePrice = firstItem?.['Log Sale Price'] || 
                            firstItem?.['log sale price'] ||
                            firstItem?.['LogSalePrice'] ||
                            firstItem?.['logSalePrice'];
        
        if (typeof logSalePrice === 'number') {
          console.log('✅ Found Log Sale Price in thing.json:', logSalePrice);
          return [logSalePrice];
        }
        
        // Fallback to 'thing' field
        if (typeof firstItem?.thing === 'number') {
          return [firstItem.thing];
        }
      }
      
      // Check for 'Log Sale Price' directly on the object
      const logSalePrice = (jsonData as any)['Log Sale Price'] || 
                           (jsonData as any)['log sale price'] ||
                           (jsonData as any)['LogSalePrice'] ||
                           (jsonData as any)['logSalePrice'];
      
      if (typeof logSalePrice === 'number') {
        console.log('✅ Found Log Sale Price directly in thing.json:', logSalePrice);
        return [logSalePrice];
      }
      
      // Fallback to 'thing' field if it exists
      const thingValue = (jsonData as any).thing;
      if (typeof thingValue === 'number') {
        return [thingValue];
      }
    }
    
    // Handle array format (old format)
    if (Array.isArray(jsonData) && jsonData.length > 0) {
      const firstItem = jsonData[0];
      
      // Look for 'Log Sale Price' first
      const logSalePrice = firstItem?.['Log Sale Price'] || 
                          firstItem?.['log sale price'] ||
                          firstItem?.['LogSalePrice'] ||
                          firstItem?.['logSalePrice'];
      
      if (typeof logSalePrice === 'number') {
        console.log('✅ Found Log Sale Price in array format:', logSalePrice);
        return [logSalePrice];
      }
      
      // Fallback to 'thing' field
      if (typeof firstItem?.thing === 'number') {
        return [firstItem.thing];
      }
    }
    
    return [];
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