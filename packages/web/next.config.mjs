/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  allowedDevOrigins: ['https://inspection-interest-appreciate-republican.trycloudflare.com'],
  async rewrites() {
    const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:3001'
    return [
      {
        // /api/auth/* is handled by app/api/auth/[...all]/route.ts (explicit proxy
        // that preserves Set-Cookie). All other /api/* go through this rewrite.
        source: '/api/((?!auth/).*)',
        destination: `${apiUrl}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
