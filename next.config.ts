import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The vendor area moved from /vendor to /v, with Move pages under /v/move.
  async redirects() {
    return [
      { source: "/vendor", destination: "/v", permanent: false },
      { source: "/vendor/business", destination: "/v/move/profile", permanent: false },
      { source: "/vendor/:path*", destination: "/v/move/:path*", permanent: false },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
