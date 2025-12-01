import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@flux/ui", "@flux/utils", "@pdf-solutions/wasm"],
  output: "standalone",

  experimental: {
    serverActions: { bodySizeLimit: "50mb" },
    // replaced deprecated field:
    proxyClientMaxBodySize: "50mb",
  },

  async rewrites() {
    const API =
      process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

    return [
      {
        source: "/convert/:path*",
        destination: `${API}/convert/:path*`,
      },
      {
        source: "/pdf/:path*",
        destination: `${API}/pdf/:path*`,
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
