import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/tournaments',
  '/matches',
  '/my-matches',
  '/settings',
];

// Routes that are always public
const publicRoutes = [
  '/',
  '/auth/signin',
  '/api/auth',
];

export default withAuth(
  function middleware(req) {
    // Allow the request to continue
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Skip auth check in test or development environments only
        // SECURITY: No hostname/port-based bypass in production
        if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
          return true;
        }

        // Always allow public routes
        // Note: '/' requires exact match, other routes use prefix matching
        const isPublic = publicRoutes.some((route) => {
          if (route === '/') return pathname === '/';
          return pathname.startsWith(route);
        });

        if (isPublic) {
          return true;
        }

        // Check if route is protected
        const isProtectedRoute = protectedRoutes.some((route) =>
          pathname.startsWith(route)
        );

        // If protected route, require token
        if (isProtectedRoute) {
          return !!token;
        }

        // Allow all other routes
        return true;
      },
    },
    pages: {
      signIn: '/auth/signin',
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
