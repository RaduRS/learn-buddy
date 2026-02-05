import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.devtool = "eval-source-map";
    }
    return config;
  },
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
})(nextConfig);
