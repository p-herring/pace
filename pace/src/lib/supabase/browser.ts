"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env, hasSupabaseAuth } from "@/lib/env";

let browserClient: SupabaseClient | null = null;

export function getBrowserSupabaseClient() {
  if (!hasSupabaseAuth) {
    return null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient(
      env.supabaseUrl!,
      env.supabasePublicKey!,
    );
  }

  return browserClient;
}
