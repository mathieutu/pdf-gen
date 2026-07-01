import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  ...(process.env.DOCKER_BUILD !== 'true' && {
    outputFileTracingIncludes: {
      '/api/gen': ['./node_modules/@sparticuz/chromium/bin/**'],
    },
  }),
}

export default nextConfig
