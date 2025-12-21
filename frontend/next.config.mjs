/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow ngrok domain for dev
  allowedDevOrigins: ['unflowering-unexplicitly-scarlet.ngrok-free.dev'],

  // Hide the dev indicator (N button) in development
  devIndicators: false,

  // Proxy API requests to the backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/:path*',
      },
    ];
  },
};

export default nextConfig;
