import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@flux/ui", "@flux/utils", "@flux/wasm"],
  output: "standalone",

  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
    // @ts-ignore
    middlewareClientMaxBodySize: "50mb",
  },

  async rewrites() {
    return [
      {
        source: "/convert/:path*",
        destination: `${process.env.API_URL || "http://api:4000"}/convert/:path*`,
      },
      {
        source: "/pdf/:path*",
        destination: `${process.env.API_URL || "http://api:4000"}/pdf/:path*`,
      },
    ];
  },

  // Recommended for large files (PDF, WASM)
  compress: false,
};

export default nextConfig;
