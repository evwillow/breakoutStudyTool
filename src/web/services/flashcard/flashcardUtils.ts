/**
 * @fileoverview Client-safe utility functions for processing flashcard data.
 * @module src/web/services/flashcard/flashcardUtils.ts
 * @dependencies @/config/game.config, @breakout-study-tool/shared
 */
import { FILE_PATTERNS, GAME_CONFIG } from '@/config/game.config';
import type { FlashcardFile, FlashcardData, ProcessedFlashcardData } from '@breakout-study-tool/shared';
import type { ProcessedStockDataPoint } from '@/components/StockChart/StockChart.types';

export type { FlashcardFile, FlashcardData, ProcessedFlashcardData };

/**
 * After data point type - similar to ProcessedStockDataPoint but for after.json data
 */
export type AfterDataPoint = ProcessedStockDataPoint;

/**
 * Points text array item - can be a string or an object with various property names
 */
type PointsTextItem = string | {
  points?: string;
  point?: string;
  text?: string;
  label?: string;
  name?: string;
  [key: string]: unknown;
};

export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

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
      const baseFileName = fileName.split('/').pop() || fileName;

      if (FILE_PATTERNS.DAILY.test(baseFileName)) {
        files.set('D', file);
      } else if (FILE_PATTERNS.MINUTE.test(baseFileName)) {
        files.set('M', file);
      }
    }

    return ['D', 'M'].map(key => files.get(key)).filter(Boolean) as FlashcardFile[];
  } catch (error) {
    console.error('Error processing ordered files:', error);
    return [];
  }
}

export function extractAfterJsonData(flashcardData: FlashcardData | null): AfterDataPoint[] | null {
  if (!flashcardData?.jsonFiles) {
    return null;
  }

  let afterFile = flashcardData.jsonFiles.find(file => {
    const fileName = file.fileName.toLowerCase();
    const fileNameParts = fileName.split(/[/\\]/);
    const lastPart = fileNameParts[fileNameParts.length - 1];

    return (
      lastPart === 'after.json' ||
      fileName.endsWith('/after.json') ||
      fileName.endsWith('\\after.json') ||
      (fileName.includes('after') && fileName.endsWith('.json'))
    );
  });

  if (!afterFile) {
    afterFile = flashcardData.jsonFiles.find(file => {
      const fileName = file.fileName;
      const fileNameParts = fileName.split(/[/\\]/);
      const lastPart = fileNameParts[fileNameParts.length - 1]?.toLowerCase();
      return lastPart === 'after.json';
    });
  }

  if (!afterFile) {
    return null;
  }

  let afterData = afterFile.data;

  if (afterData && typeof afterData === 'object' && !Array.isArray(afterData)) {
    if ('value' in afterData && Array.isArray(afterData.value)) {
      afterData = afterData.value;
    } else if (Array.isArray(Object.values(afterData)[0])) {
      afterData = Object.values(afterData)[0];
    }
  }

  if (!Array.isArray(afterData) || afterData.length === 0) {
    return null;
  }

  const firstPoint = afterData[0];
  const hasValidStructure =
    firstPoint &&
    ((firstPoint.close || firstPoint.Close || firstPoint.CLOSE) ||
      (firstPoint.open || firstPoint.Open || firstPoint.OPEN));

  if (!hasValidStructure) {
    return null;
  }

  return afterData;
}

export function extractPointsTextArray(flashcardData: FlashcardData | null): string[] {
  if (!flashcardData?.jsonFiles) {
    return [];
  }

  const pointsFile = flashcardData.jsonFiles.find(file => {
    const baseFileName = file.fileName.split('/').pop() || file.fileName;
    return FILE_PATTERNS.POINTS.test(baseFileName);
  });

  if (!pointsFile || !pointsFile.data) {
    return [];
  }

  try {
    const jsonData = pointsFile.data;

    if (Array.isArray(jsonData)) {
      return jsonData
        .map(item => {
          if (typeof item === 'string') {
            return item;
          }
          if (typeof item === 'object' && item !== null) {
            const pointsValue =
              item.points || item.point || item.text || item.label || item.name;
            if (typeof pointsValue === 'string') {
              return pointsValue;
            }
            if (Object.keys(item).length === 1) {
              const firstValue = Object.values(item)[0];
              if (typeof firstValue === 'string') {
                return firstValue;
              }
            }
          }
          return null;
        })
        .filter(Boolean) as string[];
    }

    if (
      typeof jsonData === 'object' &&
      jsonData !== null &&
      'value' in jsonData &&
      Array.isArray((jsonData as { value: unknown[] }).value)
    ) {
      const valueArray = (jsonData as { value: PointsTextItem[] }).value;
      return valueArray
        .map((item: PointsTextItem) => {
          if (typeof item === 'string') {
            return item;
          }
          if (typeof item === 'object' && item !== null) {
            const pointsValue =
              item.points || item.point || item.text || item.label || item.name;
            if (typeof pointsValue === 'string') {
              return pointsValue;
            }
          }
          return null;
        })
        .filter(Boolean) as string[];
    }

    return [];
  } catch (error) {
    console.error('Error processing points.json:', error);
    return [];
  }
}

export function processFlashcardData(flashcardData: FlashcardData | null): ProcessedFlashcardData {
  const orderedFiles = extractOrderedFiles(flashcardData);
  const afterJsonData = extractAfterJsonData(flashcardData);
  const pointsTextArray = extractPointsTextArray(flashcardData);

  return {
    orderedFiles,
    afterJsonData,
    pointsTextArray,
  };
}

export function validateFlashcardData(flashcardData: FlashcardData | null): boolean {
  if (!flashcardData?.jsonFiles) {
    return false;
  }

  if (!flashcardData.jsonFiles.length) {
    return false;
  }

  const processed = processFlashcardData(flashcardData);

  return processed.orderedFiles.length > 0;
}

export function extractStockName(flashcardData: FlashcardData | null): string | null {
  if (!flashcardData) {
    return null;
  }

  if (flashcardData.name) {
    return flashcardData.name;
  }

  if (flashcardData.folderName) {
    return flashcardData.folderName;
  }

  if (flashcardData.jsonFiles?.[0]?.fileName) {
    const fileName = flashcardData.jsonFiles[0].fileName;
    const stockName = fileName.split('_')[0];
    return stockName || null;
  }

  return null;
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.innerWidth < GAME_CONFIG.MOBILE_BREAKPOINT || 'ontouchstart' in window;
}

