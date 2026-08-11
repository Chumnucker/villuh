/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  transpilePackages: ['@villuh/ui', '@villuh/auth', '@villuh/api'],
  experimental: {
    viewTransition: true,
  },
  allowedDevOrigins: ['https://inspection-interest-appreciate-republican.trycloudflare.com', '127.0.0.1'],
  async rewrites() {
    const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:4000'
    return [
      {
        source: '/trpc/:path*',
        destination: `${apiUrl}/trpc/:path*`,
      },
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
