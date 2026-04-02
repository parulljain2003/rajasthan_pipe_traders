import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,

  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 3600,
  },

  experimental: {
    // Tree-shake these large packages so only used exports are bundled
    optimizePackageImports: ["react", "react-dom"],
  },
};

export default nextConfig;
