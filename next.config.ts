import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for catching bugs early
  reactStrictMode: true,

  // Optimize large package imports — tree-shakes icon libraries at build time
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  // Image optimization
  images: {
    // Formats to serve (browser support: avif > webp > original)
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Clerk avatar images
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      // Uploadthing CDN (uploaded board images)
      {
        protocol: "https",
        hostname: "utfs.io",
      },
      // Uploadthing new CDN domain (v7+)
      {
        protocol: "https",
        hostname: "*.ufs.sh",
      },
    ],
  },

  // Security + performance headers applied to all routes
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
