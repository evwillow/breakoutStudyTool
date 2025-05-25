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
  // Reduce memory usage with webpack optimizations
  webpack: (config: any, { dev, isServer }: { dev: boolean; isServer: boolean }) => {
    // Optimize chunk size
    config.optimization.splitChunks = {
      chunks: 'all',
      maxInitialRequests: 25,
      minSize: 20000,
      cacheGroups: {
        default: false,
        vendors: false,
        framework: {
          name: 'framework',
          test: /[\\/]node_modules[\\/](@react|react|react-dom|next|scheduler)[\\/]/,
          priority: 40,
          // Only bundle used code
          enforce: true,
        },
        lib: {
          test: /[\\/]node_modules[\\/]/,
          priority: 30,
          minChunks: 2,
        },
      },
    };

    // Return the modified config
    return config;
  },
  // Control the build memory usage with supported experimental options
  experimental: {
    // Optimize server components with better treeshaking
    optimizeServerReact: true,
    // Use memory optimizations where available
    optimizeCss: true,
  },
};

module.exports = nextConfig;
