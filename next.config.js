/** @type {import('next').NextConfig} */
const nextConfig = {
  // Suppress source map related 404 errors in development
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.devtool = 'eval-source-map'
    }
    return config
  },
  
  // Disable source maps in development to prevent 404 errors
  productionBrowserSourceMaps: false,
  
  // Experimental features
  experimental: {
    // Disable source maps for better performance
    optimizePackageImports: ['lucide-react'],
  },
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      }
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
}

module.exports = nextConfig