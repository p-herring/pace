import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env, hasSupabaseAuth } from "@/lib/env";

export async function createServerSupabaseClient() {
  if (!hasSupabaseAuth) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl!, env.supabasePublicKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot mutate cookies directly.
        }
      },
    },
  });
}
