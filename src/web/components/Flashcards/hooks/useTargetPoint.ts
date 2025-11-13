/**
 * @fileoverview Hook for calculating target point and ranges from flashcard data.
 * @module src/web/components/Flashcards/hooks/useTargetPoint.ts
 */
"use client";

import { useMemo } from "react";
import type { ProcessedFlashcardData } from "@breakout-study-tool/shared";

export interface TargetPoint {
  x: number;
  y: number;
  chartX: number;
  chartY: number;
}

export interface PriceRange {
  min: number;
  max: number;
}

export interface TimeRange {
  min: number;
  max: number;
}

export interface UseTargetPointReturn {
  targetPoint: TargetPoint | null;
  priceRange: PriceRange | null;
  timeRange: TimeRange | null;
}

export function useTargetPoint(processedData: ProcessedFlashcardData): UseTargetPointReturn {
  return useMemo(() => {
    if (!processedData.afterJsonData || !Array.isArray(processedData.afterJsonData) || processedData.afterJsonData.length === 0) {
      return { targetPoint: null, priceRange: null, timeRange: null };
    }
    
    const mainData = processedData.orderedFiles[0]?.data || [];
    const mainDataLength = mainData.length;
    
    // Find peak close price in after data
    let maxClose = -Infinity;
    let maxIndex = -1;
    let maxPrice = 0;
    
    processedData.afterJsonData.forEach((point: any, index: number) => {
      const close = point.close || point.Close || point.CLOSE;
      if (close && typeof close === 'number' && close > maxClose) {
        maxClose = close;
        maxIndex = index;
        maxPrice = close;
      }
    });
    
    if (maxIndex === -1) return { targetPoint: null, priceRange: null, timeRange: null };
    
    // Calculate price range from all data (main + after)
    const allPrices: number[] = [];
    mainData.forEach((point: any) => {
      const close = point.close || point.Close || point.CLOSE;
      if (close && typeof close === 'number') allPrices.push(close);
    });
    processedData.afterJsonData.forEach((point: any) => {
      const close = point.close || point.Close || point.CLOSE;
      if (close && typeof close === 'number') allPrices.push(close);
    });
    
    const priceMin = Math.min(...allPrices);
    const priceMax = Math.max(...allPrices);
    const pricePadding = (priceMax - priceMin) * 0.2; // 20% padding
    
    // Calculate time range
    const totalTimePoints = mainDataLength + processedData.afterJsonData.length;
    const timeMin = 0;
    const timeMax = totalTimePoints * 1.5; // Extend 50% beyond
    const timeIndex = mainDataLength + maxIndex;
    
    return {
      targetPoint: {
        x: timeIndex,
        y: maxPrice,
        chartX: 0,
        chartY: 0,
      },
      priceRange: {
        min: priceMin - pricePadding,
        max: priceMax + pricePadding,
      },
      timeRange: {
        min: timeMin,
        max: timeMax,
      }
    };
  }, [processedData.afterJsonData, processedData.orderedFiles]);
}

