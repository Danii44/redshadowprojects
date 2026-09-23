import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files, API routes, login page, and Next.js internals
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Check for Supabase auth cookie token
  const authCookie =
    request.cookies.get("sb-access-token")?.value ||
    request.cookies.get("sb-refresh-token")?.value ||
    Array.from(request.cookies.getAll()).some((cookie) =>
      cookie.name.includes("-auth-token"),
    );

  // If no auth cookie, redirect to /login
  if (!authCookie) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
