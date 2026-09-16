import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async redirects() {
    return [
      { source: "/ops", destination: "/", permanent: false },
      { source: "/policy", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
