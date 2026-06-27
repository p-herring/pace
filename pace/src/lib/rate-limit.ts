// Best-effort, single-instance rate limiting sized for a small beta. State is
// in-memory, so it resets on redeploy and isn't shared across multiple
// server instances/regions — fine as a baseline, not a substitute for
// Supabase's own Auth rate limits (configure those in the Supabase dashboard,
// per docs/PACE_BETA_SETUP.md) or a shared store like Upstash Redis at real scale.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_TRACKED_KEYS = 5000;

function sweepExpired(now: number) {
  if (buckets.size < MAX_TRACKED_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

/** Returns true if `key` has exceeded `limit` attempts within `windowMs`. */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweepExpired(now);

  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  bucket.count += 1;
  return bucket.count > limit;
}

/** Best-effort client identifier from standard proxy headers. */
export async function clientIp(): Promise<string> {
  const { headers } = await import("next/headers");
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headerList.get("x-real-ip") ?? "unknown";
}
