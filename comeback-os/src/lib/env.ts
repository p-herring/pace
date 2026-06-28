export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabasePublicKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  stravaClientId: process.env.STRAVA_CLIENT_ID,
  stravaClientSecret: process.env.STRAVA_CLIENT_SECRET,
  corosClientId: process.env.COROS_CLIENT_ID,
  corosClientSecret: process.env.COROS_CLIENT_SECRET,
  trainingPeaksClientId: process.env.TRAININGPEAKS_CLIENT_ID,
  trainingPeaksClientSecret: process.env.TRAININGPEAKS_CLIENT_SECRET,
};

export const hasSupabase = Boolean(env.supabaseUrl && env.supabasePublicKey);
export const hasStrava = Boolean(env.stravaClientId && env.stravaClientSecret);
export const hasCoros = Boolean(env.corosClientId && env.corosClientSecret);
export const hasTrainingPeaks = Boolean(
  env.trainingPeaksClientId && env.trainingPeaksClientSecret,
);
