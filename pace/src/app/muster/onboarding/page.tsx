import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
import { MusterAuthBrand } from "@/components/muster-auth-brand";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Onboarding() {
  const supabase = await createServerSupabaseClient();
  let displayName = "";
  let avatarUrl: string | null = null;
  let userId = "";
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
      const { data: profile } = await supabase
        .from("pace_profiles")
        .select("display_name,avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      // Falls back to what was typed at sign-up, set automatically when the account was created.
      displayName = profile?.display_name ?? "";
      avatarUrl = profile?.avatar_url ?? null;
    } else {
      redirect("/muster/sign-in");
    }
  }

  return (
    <main className="muster-auth muster-auth-inner">
      <MusterAuthBrand />
      <OnboardingForm userId={userId} displayName={displayName} avatarUrl={avatarUrl} />
    </main>
  );
}
