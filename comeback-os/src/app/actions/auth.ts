"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const supabase = await createServerSupabaseClient();

  if (!supabase || !email) {
    redirect("/");
  }

  await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001"}/auth/callback`,
    },
  });

  redirect("/");
}
