import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'github.com', pathname: '/mathieutu.png' }],
  },
  ...(process.env.DOCKER_BUILD !== 'true' && {
    outputFileTracingIncludes: {
      '/api/gen': ['./node_modules/@sparticuz/chromium/bin/**'],
    },
  }),
}

export default nextConfig
