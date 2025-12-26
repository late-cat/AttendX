/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow ngrok domain for dev
  allowedDevOrigins: ['unflowering-unexplicitly-scarlet.ngrok-free.dev'],

  // Hide the dev indicator (N button) in development
  devIndicators: false,

  // No rewrites needed - frontend calls backend URL directly via NEXT_PUBLIC_API_URL
};

export default nextConfig;
