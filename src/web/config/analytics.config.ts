/**
 * @fileoverview Analytics configuration for tracking and measurement services.
 * @module src/web/config/analytics.config.ts
 */

/**
 * Analytics Configuration
 * Centralized configuration for analytics services including Google Analytics
 */
export const analyticsConfig = {
  googleAnalytics: {
    /** Google Analytics measurement ID */
    measurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-CSGDH5PT27",
    /** Whether analytics is enabled (production only by default) */
    enabled: process.env.NODE_ENV === "production",
  },
} as const;

/**
 * Google Analytics initialization script configuration
 * Only returns config if analytics is enabled
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
 * Only returns config if analytics is enabled
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

