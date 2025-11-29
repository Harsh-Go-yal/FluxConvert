import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@flux/ui", "@flux/utils", "@flux/wasm"],
  output: "standalone",

  experimental: {
    serverActions: { bodySizeLimit: "50mb" },
    // @ts-ignore
    middlewareClientMaxBodySize: "50mb",
  },

  async rewrites() {
    const API = process.env.NEXT_PUBLIC_API_URL;

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
};

export default nextConfig;
