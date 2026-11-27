import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getAuthMode, getSessionSecret, SESSION_COOKIE } from "@/lib/auth/config";
import { verifySession } from "@/lib/auth/session";

const PUBLIC_PATHS = ["/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Public operational checks (they reveal no data).
  if (pathname.startsWith("/api/health/")) return NextResponse.next();
  const isLanding = pathname === "/";
  const isPublic = isLanding || PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isApi = pathname.startsWith("/api/");
  const mode = getAuthMode();

  let response = NextResponse.next({ request });
  let authed = false;

  if (mode === "supabase") {
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    authed = Boolean(data.user);
  } else if (mode !== "disabled") {
    const secret = getSessionSecret(mode);
    const payload = secret ? await verifySession(request.cookies.get(SESSION_COOKIE)?.value, secret) : null;
    authed = Boolean(payload && payload.mode === mode);
  }

  if (!authed && !isPublic) {
    if (isApi) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  // Signed-in users skip the login page; the landing page stays available to everyone.
  if (authed && isPublic && !isLanding) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|svg|webp|ico|mp3|wav)$).*)"],
};
