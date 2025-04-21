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
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    // Enable mock database by default in development mode
    NEXT_PUBLIC_USE_MOCK_DB: process.env.NODE_ENV === 'development' ? 'true' : 'false',
  },
};

module.exports = nextConfig;
