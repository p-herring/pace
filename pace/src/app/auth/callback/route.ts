import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { env, hasSupabaseAuth } from "@/lib/env";

function safeRedirect(path: string | null, origin: string) {
  if (path && path.startsWith("/") && !path.startsWith("//")) {
    return new URL(path, origin);
  }

  return new URL("/muster", origin);
}

export async function GET(request: NextRequest) {
  if (!hasSupabaseAuth) {
    return NextResponse.redirect(new URL("/muster/sign-in", request.url));
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const type = requestUrl.searchParams.get("type");
  const nextPath = requestUrl.searchParams.get("next");
  const redirectTarget = type === "recovery" ? "/muster/update-password" : nextPath;

  let response = NextResponse.redirect(safeRedirect(redirectTarget, request.url));
  const cookieStore = await cookies();

  const supabase = createServerClient(env.supabaseUrl!, env.supabasePublicKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      response = NextResponse.redirect(
        new URL(`/muster/sign-in?error=${encodeURIComponent(error.message)}`, request.url),
      );
    }
    // email_verified_at on pace_profile_private is kept in sync automatically by a
    // Postgres trigger (see supabase/migrations/202606240001_pace_email_verification_sync.sql)
    // whenever Supabase Auth confirms the email — no app-level write needed here.
  }

  return response;
}
