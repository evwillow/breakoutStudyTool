/**
 * @fileoverview Data processing helpers for StockChart hooks.
 * @module src/web/components/StockChart/utils/calculations.ts
 * @dependencies ../types
 */

import type { ChartType } from "@breakout-study-tool/shared";
import type { NormalizedCandle } from "../types";

const PRICE_KEYS = ["close", "Close", "price", "Price", "last", "Last"];
const OPEN_KEYS = ["open", "Open"];
const HIGH_KEYS = ["high", "High"];
const LOW_KEYS = ["low", "Low"];
const VOLUME_KEYS = ["volume", "Volume", "VOLUME"];
const SMA10_KEYS = ["sma10", "SMA10", "ma10", "MA10", "ema10", "EMA10", "10sma", "10SMA"];
const SMA20_KEYS = ["sma20", "SMA20", "ma20", "MA20", "ema20", "EMA20", "20sma", "20SMA"];
const SMA50_KEYS = ["sma50", "SMA50", "ma50", "MA50", "ema50", "EMA50", "50sma", "50SMA"];

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pickFirst(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    const numeric = toNumber(value);
    if (numeric !== null) {
      return numeric;
    }
  }
  return null;
}

function parseJsonIfNeeded(record: Record<string, unknown>): Record<string, unknown> {
  if (typeof record.json === "string") {
    try {
      const parsed = JSON.parse(record.json);
      return { ...record, ...parsed };
    } catch (error) {
      console.warn("Failed to parse embedded JSON payload in chart data", error);
    }
  }
  return record;
}

export function normalizeDataset(raw: unknown, chartType: ChartType): NormalizedCandle[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const candles: NormalizedCandle[] = [];

  raw.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") {
      return;
    }

    const merged = parseJsonIfNeeded(entry as Record<string, unknown>);
    const open = pickFirst(merged, OPEN_KEYS);
    const high = pickFirst(merged, HIGH_KEYS);
    const low = pickFirst(merged, LOW_KEYS);
    const close = pickFirst(merged, PRICE_KEYS);
    const volume = pickFirst(merged, VOLUME_KEYS) ?? 0;

    if (open === null || high === null || low === null || close === null) {
      return;
    }

    candles.push({
      index,
      timestamp: typeof merged.date === "string" ? merged.date : undefined,
      open,
      high,
      low,
      close,
      volume,
      sma10: pickFirst(merged, SMA10_KEYS),
      sma20: pickFirst(merged, SMA20_KEYS),
      sma50: pickFirst(merged, SMA50_KEYS),
    });
  });

  if ((chartType === "hourly" || chartType === "H") && candles.length > 0) {
    if (!candles.some((candle) => candle.sma10 !== null && candle.sma10 !== undefined)) {
      applySMA(candles, 10, (candle, value) => (candle.sma10 = value));
    }
    if (!candles.some((candle) => candle.sma20 !== null && candle.sma20 !== undefined)) {
      applySMA(candles, 20, (candle, value) => (candle.sma20 = value));
    }
  }

  return candles;
}

export function applySMA(
  candles: NormalizedCandle[],
  period: number,
  assign: (candle: NormalizedCandle, value: number | null) => void,
): void {
  if (period <= 1 || candles.length < period) {
    return;
  }

  const window: number[] = [];
  let sum = 0;

  candles.forEach((candle, index) => {
    window.push(candle.close);
    sum += candle.close;

    if (window.length > period) {
      sum -= window.shift() ?? 0;
    }

    if (window.length === period) {
      assign(candle, sum / period);
    } else {
      assign(candle, null);
    }
  });
}

export function resolveVisibleAfterData(
  candles: NormalizedCandle[],
  progressPercentage: number,
): NormalizedCandle[] {
  if (!candles.length) {
    return [];
  }
  const clampedProgress = Math.min(Math.max(progressPercentage, 0), 100);
  const visibleCount = Math.floor((candles.length * clampedProgress) / 100);
  return candles.slice(0, Math.max(visibleCount, clampedProgress > 0 ? 1 : 0));
}
