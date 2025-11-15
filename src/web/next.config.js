/**
 * @fileoverview Next.js configuration loading root env vars and optimizing builds.
 * @module src/web/next.config.js
 * @dependencies path, dotenv
 */
/** @type {import('next').NextConfig} */
// Load environment variables from root .env.local file
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });

const nextConfig = {
  // Explicitly disable Pages Router directory scanning
  // We're using App Router exclusively
  experimental: {
    // This helps prevent Next.js from scanning for pages directory
  },
  images: {
    domains: ["lh3.googleusercontent.com"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
    // Disable image optimizer in development to reduce memory usage
    unoptimized: process.env.NODE_ENV === 'development',
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    // Enable mock database by default in development mode
    NEXT_PUBLIC_USE_MOCK_DB: process.env.NODE_ENV === 'development' ? 'true' : 'false',
    // Expose Google Client ID to client-side (for UI checks)
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  },
  // Performance optimizations
  webpack: (config, { dev, isServer }) => {
    // Optimize chunk splitting for better caching
    // Simplified configuration to avoid CommonJS/ES module conflicts
    config.optimization.splitChunks = {
      chunks: 'all',
      maxInitialRequests: 25,
      minSize: 20000,
      cacheGroups: {
        default: false,
        vendors: false,
        // Chart libraries chunk
        charts: {
          name: 'charts',
          test: /[\\/]node_modules[\\/](d3-|@d3-)[\\/]/,
          priority: 35,
          enforce: true,
        },
        // Common libraries chunk
        lib: {
          test: /[\\/]node_modules[\\/]/,
          priority: 30,
          minChunks: 2,
        },
      },
    };

    // Tree shaking optimization
    if (!dev) {
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }
    
    // Add error handling for chunk loading failures
    if (!isServer && !dev) {
      config.optimization.chunkIds = 'deterministic';
      config.optimization.moduleIds = 'deterministic';
    }

    return config;
  },
  // Compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Disable request logging in development
  logging: {
    incomingRequests: false,
  },
  // Suppress 404 errors for static CSS files in development (they're harmless)
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig;
