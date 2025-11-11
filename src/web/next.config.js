/** @type {import('next').NextConfig} */
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
  },
  // Performance optimizations
  webpack: (config, { dev, isServer }) => {
    // Optimize chunk splitting for better caching
    config.optimization.splitChunks = {
      chunks: 'all',
      maxInitialRequests: 25,
      minSize: 20000,
      cacheGroups: {
        default: false,
        vendors: false,
        // Framework chunk for React/Next.js core
        framework: {
          name: 'framework',
          test: /[\\/]node_modules[\\/](@react|react|react-dom|next|scheduler)[\\/]/,
          priority: 40,
          enforce: true,
        },
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
};

module.exports = nextConfig;
