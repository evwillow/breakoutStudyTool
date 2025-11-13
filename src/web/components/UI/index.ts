/**
 * @fileoverview Barrel exports for UI helper components used across the app.
 * @module src/web/components/UI/index.ts
 * @dependencies none
 */
// UI Components Barrel Export
export { default as Popup } from './Popup';
export { default as BackButton } from './BackButton';
export { default as ActionButtonsRow } from './ActionButtonsRow';
export { default as TimerDurationSelector } from './TimerDurationSelector';
export { default as DistanceFeedback } from './DistanceFeedback';
export { default as SelectionTooltip } from './SelectionTooltip';
// ChartMagnifier is now in chartMagnifier subdirectory
export { default as ChartMagnifier } from './chartMagnifier'; 