import { createClient } from "@supabase/supabase-js";
import { env, hasSupabaseService } from "@/lib/env";

export function createServiceSupabaseClient() {
  if (!hasSupabaseService) {
    return null;
  }

  return createClient(env.supabaseUrl!, env.supabaseServiceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
