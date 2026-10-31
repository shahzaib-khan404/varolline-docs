import type { NextConfig } from "next";

const BACKEND_URL =
  process.env.BACKEND_PROXY_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

const isProduction = process.env.NODE_ENV === "production";

// Safe connect-src origins: only include localhost during development
const connectSrcOrigins = isProduction
  ? `'self' ${BACKEND_URL} https://accounts.google.com https://api.github.com`
  : `'self' ${BACKEND_URL} http://localhost:8000 http://localhost:8001 https:`;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // Prevents exposing 'x-powered-by: Next.js' header
  output: "standalone",
  turbopack: {
    root: __dirname,
  },

  // Proxy /api/v1/* and /uploads/* to FastAPI backend.
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${BACKEND_URL}/uploads/:path*`,
      },
    ];
  },

  // Image optimization
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },

  // Bundle analyzer (enable with ANALYZE=true)
  ...(process.env.ANALYZE === "true" && {
    webpack(config: any) {
      const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
      config.plugins.push(new BundleAnalyzerPlugin({ analyzerMode: "server" }));
      return config;
    },
  }),

  // Security headers & Cache controls
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'", // unsafe-eval removed
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' https://fonts.gstatic.com data:",
              `connect-src ${connectSrcOrigins}`,
              "frame-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
      // Prevent caching for administrative and user dashboard sessions
      {
        source: "/(admin|dashboard|history|profile|settings)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },

  // Redirect www to non-www in production
  async redirects() {
    return [];
  },
};

export default nextConfig;
