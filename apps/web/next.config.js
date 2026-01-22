/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@fightrise/ui', '@fightrise/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
