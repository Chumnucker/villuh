/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  allowedDevOrigins: ['https://inspection-interest-appreciate-republican.trycloudflare.com'],
  async rewrites() {
    const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:3001'
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
