/**
 * @fileoverview Barrel export for chart magnifier components and utilities.
 * @module src/web/components/UI/chartMagnifier/index.ts
 * @dependencies ./ChartMagnifier
 */
export { default } from './ChartMagnifier';
export { default as ChartMagnifier } from './ChartMagnifier';
export * from './utils/magnifierUtils';
export * from './hooks/useChartMagnifierBounds';
export * from './hooks/useChartMagnifierPosition';
export * from './hooks/useChartMagnifierTouch';
export * from './hooks/useChartMagnifierScroll';

