import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['sharp'],
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
