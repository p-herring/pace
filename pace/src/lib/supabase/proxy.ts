import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env, hasSupabaseAuth } from "@/lib/env";

// /muster/* is a flat namespace, so these are exact paths rather than prefixes —
// "/muster" must not also match "/muster/sign-up".
const PROTECTED_PACE_PATHS = ["/muster", "/muster/new", "/muster/onboarding", "/muster/account", "/muster/account/delete"];
// Dynamic routes get their own prefix list, checked separately so a prefix like
// "/muster/report/" can't accidentally swallow an unrelated top-level "/muster/..." path.
const PROTECTED_PACE_PREFIXES = ["/muster/report/", "/muster/plan/"];
const GUEST_ONLY_PACE_PATHS = ["/muster/sign-up", "/muster/sign-in"];

export async function updateSession(request: NextRequest) {
  if (!hasSupabaseAuth) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(env.supabaseUrl!, env.supabasePublicKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (
    (PROTECTED_PACE_PATHS.includes(pathname) || PROTECTED_PACE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) &&
    !user
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/muster/sign-in";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (GUEST_ONLY_PACE_PATHS.includes(pathname) && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/muster";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
