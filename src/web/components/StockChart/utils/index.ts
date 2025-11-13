/**
 * @fileoverview Backwards-compatible utility exports for StockChart tests.
 * @module src/web/components/StockChart/utils/index.ts
 */

import type { ChartType } from "@breakout-study-tool/shared";
import { normalizeDataset, applySMA } from "./calculations";

const PRICE_KEYS = ["close", "Close", "price", "Price", "last", "Last"];
const VOLUME_KEYS = ["volume", "Volume", "VOLUME"];
const SMA_KEYS = ["sma10", "SMA10", "ma10", "MA10", "sma20", "SMA20", "ma20", "MA20", "sma50", "SMA50", "ma50", "MA50"];

export function getPrice(record: Record<string, unknown>, keys: string[] = PRICE_KEYS): number | null {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      const value = Number(record[key]);
      if (Number.isFinite(value)) {
        return value;
      }
    }
  }
  return null;
}

export function getVolume(record: Record<string, unknown>, keys: string[] = VOLUME_KEYS): number | null {
  return getPrice(record, keys);
}

export function hasSMAData(data: unknown): boolean {
  const dataset = Array.isArray(data) ? data : [];
  return dataset.some((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }
    return SMA_KEYS.some((key) => entry[key as keyof typeof entry] !== undefined);
  });
}

export function getSMAConfig(chartType: ChartType) {
  if (chartType === "hourly" || chartType === "H") {
    return { showSMA10: true, showSMA20: true, showSMA50: false };
  }
  if (chartType === "monthly" || chartType === "M") {
    return { showSMA10: false, showSMA20: true, showSMA50: true };
  }
  return { showSMA10: true, showSMA20: true, showSMA50: true };
}

export { normalizeDataset, applySMA as calculateSMA };
