const isDev = process.env.NODE_ENV === 'development';

// Content Security Policy
// P2 LIMITATION: 'unsafe-inline' is required for Next.js styled-jsx and inline styles.
// This weakens XSS protection but is necessary for Next.js functionality.
// Future improvement: Implement nonce-based CSP using Next.js middleware.
// See: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
// Note: 'unsafe-eval' only in development for hot reload.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ''};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://cdn.discordapp.com https://images.start.gg;
  font-src 'self';
  connect-src 'self' https://api.start.gg https://discord.com wss://gateway.discord.gg;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s+/g, ' ')
  .trim();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // P1 FIX: Enable instrumentation for startup validation
  experimental: {
    instrumentationHook: true,
  },
  transpilePackages: ['@fightrise/ui', '@fightrise/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.start.gg',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Control referrer information
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Restrict browser features
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
          // Content Security Policy
          { key: 'Content-Security-Policy', value: cspHeader },
          // HSTS - only in production (requires HTTPS)
          ...(isDev
            ? []
            : [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]),
        ],
      },
      {
        // Prevent caching of API responses
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
