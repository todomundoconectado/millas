import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'millas.com.br',
        pathname: '/wp-content/uploads/**',
      },
    ],
  },
}

export default nextConfig
