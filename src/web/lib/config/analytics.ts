/**
 * @fileoverview Re-exports analytics configuration from centralized config.
 * @module src/web/lib/config/analytics.ts
 * @dependencies @/config/analytics.config
 * 
 * @deprecated This file is maintained for backward compatibility.
 * New code should import directly from @/config/analytics.config
 */

// Re-export from centralized config
export {
  analyticsConfig,
  getGoogleAnalyticsScript,
  getGoogleAnalyticsConfig,
} from '@/config/analytics.config'; 