/**
 * @fileoverview Barrel exports for shared types and utility helpers.
 * @module lib/shared/src/index.ts
 * @dependencies ./types, ./utils/date, ./utils/format, ./utils/validation
 */
// Types - centralized type definitions
export * from './types';

// Common utilities
export * from './utils/date';
export * from './utils/format';
export * from './utils/validation';
