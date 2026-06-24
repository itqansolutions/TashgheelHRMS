import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

const PUBLIC_PAGES = ['/login', '/forgot-password', '/reset-password'];

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Check if the pathname is public or private
  // Strip locale prefix (e.g. /en/login -> /login)
  const pathnameWithoutLocale = pathname.replace(/^\/(en|ar)/, '') || '/';
  
  const isPublicPage = PUBLIC_PAGES.some((page) => pathnameWithoutLocale.startsWith(page));

  // 2. Check for token cookie
  const token = req.cookies.get('token')?.value;

  // 3. Auth redirects
  if (!isPublicPage && !token) {
    // Redirect to login page in the correct locale
    const locale = pathname.startsWith('/ar') ? 'ar' : 'en';
    const loginUrl = new URL(`/${locale}/login`, req.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublicPage && token && pathnameWithoutLocale !== '/') {
    // If logged in, redirect away from public pages to dashboard
    const locale = pathname.startsWith('/ar') ? 'ar' : 'en';
    const dashboardUrl = new URL(`/${locale}/dashboard`, req.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // 4. Fall through to next-intl middleware
  return intlMiddleware(req);
}

export const config = {
  // Match all pathnames except API routes, static assets, and dev files
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|brand|.*\\.png|.*\\.svg).*)',
  ],
};
