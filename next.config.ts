/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["lh3.googleusercontent.com", "drive.google.com"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "drive.google.com",
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
  webpack: (config: any, { dev, isServer }: { dev: boolean; isServer: boolean }) => {
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
          test: /[\\/]node_modules[\\/](recharts|d3-|@d3-)[\\/]/,
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

    return config;
  },
  // Experimental optimizations
  experimental: {
    // Optimize server components
    optimizeServerReact: true,
    // CSS optimization
    optimizeCss: true,
    // Enable modern bundling
    esmExternals: true,
  },
  // Compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

module.exports = nextConfig;
