export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  supabaseUrl:
    process.env.NEXT_PUBLIC_PACE_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabasePublicKey:
    process.env.NEXT_PUBLIC_PACE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

export const hasSupabaseAuth = Boolean(
  env.supabaseUrl && env.supabasePublicKey,
);

export const hasSupabaseService = Boolean(
  env.supabaseUrl && env.supabaseServiceRoleKey,
);
