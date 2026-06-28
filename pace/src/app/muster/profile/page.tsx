import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MyProfileRedirect() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/muster");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/muster/sign-in");

  redirect(`/muster/profile/${user.id}`);
}
