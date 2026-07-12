import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Founder-only app (US-012): everything requires a session except the
 * login page, the public checker (P10), its API routes, and /api/health.
 */
const PUBLIC_PATTERNS = [
  /^\/login(\/|$)/,
  /^\/public(\/|$)/,
  /^\/api\/public(\/|$)/,
  /^\/api\/health(\/|$)/,
];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const isPublic = PUBLIC_PATTERNS.some((re) =>
    re.test(request.nextUrl.pathname)
  );

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  let user = null;
  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  if (!user && !isPublic) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Founder login required." } },
        { status: 401 }
      );
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
