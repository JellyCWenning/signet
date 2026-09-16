import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async redirects() {
    return [
      { source: "/ops", destination: "/", permanent: false },
      { source: "/policy", destination: "/", permanent: false },
      { source: "/console", destination: "/", permanent: false },
      { source: "/flow", destination: "/", permanent: false },
      { source: "/settings", destination: "/", permanent: false },
      { source: "/bot", destination: "/", permanent: false },
      { source: "/queue", destination: "/", permanent: false },
      { source: "/queue/:path*", destination: "/", permanent: false },
      { source: "/audit", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
