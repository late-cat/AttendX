
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow ngrok domain for dev
  allowedDevOrigins: ['unflowering-unexplicitly-scarlet.ngrok-free.dev'],

  // Hide the dev indicator (N button) in development
  devIndicators: false,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/attendx-572c8.firebasestorage.app/**',
      },
    ],
  },
};

export default nextConfig;
