/**
 * @fileoverview Formatting helpers for StockChart visuals.
 * @module src/web/components/StockChart/utils/formatters.ts
 */

export function formatPrice(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  if (value >= 1000) {
    return value.toFixed(2);
  }
  if (value >= 100) {
    return value.toFixed(2);
  }
  if (value >= 10) {
    return value.toFixed(3);
  }
  return value.toFixed(4);
}

export function formatVolume(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}
