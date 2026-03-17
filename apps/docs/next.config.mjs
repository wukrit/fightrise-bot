/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/fightrise-bot/docs',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
}

export default nextConfig
