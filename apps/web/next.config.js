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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // HSTS only for production
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
        // Only apply HSTS in production (when not localhost)
        has: [
          {
            type: 'header',
            key: 'host',
            value: '(?<!localhost)(?::\\d+)?$',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
