import type { NextConfig } from "next";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_URL ||
  "http://localhost:4000";

const nextConfig: NextConfig = {
  transpilePackages: ["@flux/ui", "@flux/utils", "@pdf-solutions/wasm"],
  output: "standalone",

  experimental: {
    serverActions: { bodySizeLimit: "50mb" },
    proxyClientMaxBodySize: "50mb",
  },

  async rewrites() {
    // ONLY return valid URLs
    return [
      {
        source: "/convert/:path*",
        destination: `${API_BASE}/convert/:path*`,
      },
      {
        source: "/pdf/:path*",
        destination: `${API_BASE}/pdf/:path*`,
      },
    ];
  },

  compress: false,

  webpack(config) {
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });
    return config;
  },
};

export default nextConfig;
