import withPWA from "next-pwa";

const nextConfig = {
  /* config options here */
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
})(nextConfig);
