/**
 * @fileoverview Feature flags and experimental feature toggles.
 * @module src/web/config/feature.config.ts
 */

/**
 * Feature Flags Configuration
 * Control experimental features and feature toggles
 */
export const FEATURE_FLAGS = {
  /** Enable coordinate-based selection (replaces button-based selection) */
  COORDINATE_SELECTION: true,
  /** Enable chart magnifier tool */
  CHART_MAGNIFIER: true,
  /** Enable after-chart animation */
  AFTER_CHART_ANIMATION: true,
  /** Enable tutorial onboarding */
  TUTORIAL: true,
  /** Enable analytics tracking */
  ANALYTICS: process.env.NODE_ENV === 'production',
  /** Enable round history display */
  ROUND_HISTORY: true,
  /** Enable folder selection */
  FOLDER_SELECTION: true,
} as const;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[feature];
}

/**
 * Get all feature flags as a record
 */
export function getAllFeatureFlags(): Record<string, boolean> {
  return { ...FEATURE_FLAGS };
}

