// File: apps/frontend/next.config.js
// Purpose: Next.js config — disables Turbopack, uses webpack
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui"],
  // experimental: {
  //   turbopack: false,
  // },
};

export default nextConfig;