/**
 * @fileoverview Analytics configuration helpers for initializing tracking settings.
 * @module src/web/lib/config/analytics.ts
 * @dependencies @/lib/utils/logger
 */
import { logger } from '@/lib/utils/logger';

/**
 * Analytics Configuration
 * 
 * Centralized configuration for analytics services including Google Analytics.
 * This allows for better environment-based control and easier maintenance.
 */

export const analyticsConfig = {
  googleAnalytics: {
    measurementId: "G-CSGDH5PT27",
    enabled: process.env.NODE_ENV === "production",
  },
};

/**
 * Google Analytics initialization script
 * Only runs in production environment
 */
export const getGoogleAnalyticsScript = () => {
  if (!analyticsConfig.googleAnalytics.enabled) {
    return null;
  }

  return {
    strategy: "afterInteractive" as const,
    src: `https://www.googletagmanager.com/gtag/js?id=${analyticsConfig.googleAnalytics.measurementId}`,
  };
};

/**
 * Google Analytics configuration script
 * Only runs in production environment
 */
export const getGoogleAnalyticsConfig = () => {
  if (!analyticsConfig.googleAnalytics.enabled) {
    return null;
  }

  return {
    id: "google-analytics",
    strategy: "afterInteractive" as const,
    dangerouslySetInnerHTML: {
      __html: `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${analyticsConfig.googleAnalytics.measurementId}');
      `,
    },
  };
}; 