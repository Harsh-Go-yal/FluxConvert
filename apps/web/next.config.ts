import type { NextConfig } from "next";
import type { Configuration as WebpackConfig } from "webpack";

const isProd = process.env.NODE_ENV === "production";

const API_BASE = isProd
  ? "https://fluxconvert-production.up.railway.app"
  : "http://localhost:4000";

const nextConfig: NextConfig = {
  transpilePackages: ["@flux/ui", "@flux/utils", "@pdf-solutions/wasm"],
  output: "standalone",

  experimental: {
    serverActions: { bodySizeLimit: "50mb" },
    proxyClientMaxBodySize: "50mb",
  },

  async rewrites() {
    return [
      {
        source: "/convert/:path*",
        destination: `${API_BASE}/convert/:path*`,
      },
      {
        source: "/pdf/:path*",
        destination: `${API_BASE}/pdf/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${API_BASE}/api/:path*`,
      },
    ];
  },

  webpack: (config: WebpackConfig) => {
    config.module?.rules?.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });
    return config;
  },

  compress: false,
};

export default nextConfig;
