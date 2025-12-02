import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@flux/ui", "@flux/utils", "@pdf-solutions/wasm"],
  output: "standalone",

  experimental: {
    serverActions: { bodySizeLimit: "50mb" },
    proxyClientMaxBodySize: "50mb",
  },

  async rewrites() {
    /**
     * API URL priority:
     * 1. NEXT_PUBLIC_API_URL (browser + server)
     * 2. API_URL (server only)
     * 3. Local fallback for dev
     */
    const API_BASE =
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.API_URL ||
      "http://localhost:4000/api";

    return [
      // Convert service
      {
        source: "/convert/:path*",
        destination: `${API_BASE}/convert/:path*`,
      },

      // PDF service
      {
        source: "/pdf/:path*",
        destination: `${API_BASE}/pdf/:path*`,
      },

      // Direct API passthrough
      {
        source: "/api/:path*",
        destination: `${API_BASE}/:path*`,
      },
    ];
  },

  compress: false,

  webpack: (config) => {
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });
    return config;
  },
};

export default nextConfig;
