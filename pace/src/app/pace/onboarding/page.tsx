import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
import { PaceAuthBrand } from "@/components/pace-auth-brand";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Onboarding() {
  const supabase = await createServerSupabaseClient();
  let displayName = "";
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("pace_profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      // Falls back to what was typed at sign-up, set automatically when the account was created.
      displayName = profile?.display_name ?? "";
    } else {
      redirect("/pace/sign-in");
    }
  }

  return (
    <main className="pace-auth pace-auth-inner">
      <PaceAuthBrand />
      <OnboardingForm displayName={displayName} />
    </main>
  );
}
