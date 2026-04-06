import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Next.js root middleware — runs on every matching request.
 *
 * Delegates to updateSession() which:
 *  1. Refreshes the Supabase session cookie if it is about to expire
 *  2. Redirects unauthenticated users to /login for protected routes
 */
export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT static files, images, favicon, and
     * Next.js internals. This keeps the middleware fast.
     *
     * See: https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
