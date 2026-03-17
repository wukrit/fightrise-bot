/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/fightrise-bot',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
}

export default nextConfig
