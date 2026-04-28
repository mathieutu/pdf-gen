import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/gen': ['./node_modules/@sparticuz/chromium/bin/**'],
  },
}

export default nextConfig
