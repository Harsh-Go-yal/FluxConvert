import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@flux/ui", "@flux/utils"],
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  async rewrites() {
    return [
      {
        source: "/convert/:path*",
        destination: `${process.env.API_URL || "http://api:3000"}/convert/:path*`,
      },
    ];
  },
};

export default nextConfig;
