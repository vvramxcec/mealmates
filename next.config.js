/** @type {import('next').NextConfig} */
const nextConfig = {
  // Redirect to Expo's dist output for Vercel
  distDir: 'dist',
  // Don't build Next.js, just exist for detection
  experimental: {
    webpackBuildWorker: false,
  },
};

module.exports = nextConfig;
