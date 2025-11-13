/**
 * @fileoverview Barrel exports for core, UI, feature, and layout components.
 * @module src/web/components/index.ts
 * @dependencies ./StockChart, ./ChartSection, ./DateFolderBrowser, ./UI, ./Header, ./LandingPage, ./FolderSection, ./Features, ./Auth, ./ErrorBoundary, ./FallbackUI
 */
// Main Components Barrel Export
// Core Components
export { default as StockChart } from './StockChart';
export { default as ChartSection } from './ChartSection';
export { default as DateFolderBrowser } from './DateFolderBrowser';

// UI Components
export * from './UI';

// Layout Components
export { default as Header } from './Header';
export { default as LandingPage } from './LandingPage';
export { default as FolderSection } from './FolderSection';

// Feature Components
export * from './Features';

// Auth Components
export * from './Auth';

// Error Handling
export { default as ErrorBoundary } from './ErrorBoundary';
export * from './ErrorBoundary';
export * from './FallbackUI';

// Analytics
export { default as GoogleAnalytics } from './GoogleAnalytics'; 