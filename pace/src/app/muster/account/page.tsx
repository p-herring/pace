import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, MailWarning, ShieldAlert } from "lucide-react";
import { AccountForm } from "@/components/account-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PaceAccount({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return (
      <main className="muster-app">
        <div className="muster-empty">
          <h2>Muster is being connected</h2>
          <p>The beta database configuration is not available yet.</p>
        </div>
      </main>
    );
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/muster/sign-in");

  const [{ data: profile }, { data: privateProfile }, { data: sportRows }] = await Promise.all([
    supabase.from("pace_profiles").select("display_name,avatar_url,suburb,bio,created_at,is_private").eq("id", user.id).maybeSingle(),
    supabase.from("pace_profile_private").select("latitude,longitude,email_verified_at").eq("profile_id", user.id).maybeSingle(),
    supabase.from("pace_profile_sports").select("sport").eq("profile_id", user.id),
  ]);

  const mySports = new Set((sportRows ?? []).map((row) => row.sport));
  const hasSavedLocation =
    profile?.suburb && privateProfile?.latitude != null && privateProfile?.longitude != null;

  return (
    <main className="muster-shell min-h-screen">
      

      <section className="mx-auto max-w-4xl px-5 pb-20 sm:px-8">
        <div className="mt-2">
          <p className="muster-kicker">Account</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-pace-ink sm:text-4xl">Your profile</h1>
        </div>

        {message && <p className="form-success mt-4">{message}</p>}

        <div className="account-grid">
          <div className="account-card account-summary">
            <p className="account-summary-label">Email</p>
            <p className="account-summary-value">{user.email}</p>
            {privateProfile?.email_verified_at ? (
              <p className="account-verified">
                <CheckCircle2 className="h-4 w-4" /> Verified
              </p>
            ) : (
              <p className="account-unverified">
                <MailWarning className="h-4 w-4" /> Not verified yet
              </p>
            )}
            <p className="account-summary-label">Member since</p>
            <p className="account-summary-value">
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString("en-AU", { dateStyle: "medium" })
                : "—"}
            </p>
            <Link href={`/muster/profile/${user.id}`} className="muster-secondary account-profile-link">
              View profile
            </Link>
          </div>

          <AccountForm
            userId={user.id}
            displayName={profile?.display_name ?? ""}
            avatarUrl={profile?.avatar_url ?? null}
            bio={profile?.bio ?? ""}
            mySports={mySports}
            isPrivate={profile?.is_private ?? false}
            initialLocation={
              hasSavedLocation
                ? { label: profile!.suburb!, latitude: Number(privateProfile!.latitude), longitude: Number(privateProfile!.longitude) }
                : undefined
            }
          />
        </div>

        <div className="account-card account-danger-zone">
          <p className="account-danger-kicker">
            <ShieldAlert className="h-4 w-4" /> Danger zone
          </p>
          <h2>Delete your account</h2>
          <p>
            This permanently removes your profile, sports preferences, plans you’ve hosted
            or joined, messages and notifications. It can’t be undone.
          </p>
          <Link className="muster-danger-button" href="/muster/account/delete">
            Delete my account
          </Link>
        </div>
      </section>
    </main>
  );
}
