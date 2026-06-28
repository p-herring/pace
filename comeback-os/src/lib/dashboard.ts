import { demoDashboardData } from "@/lib/demo-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ComebackDashboardData } from "@/lib/types";

export async function getDashboardData(): Promise<{
  data: ComebackDashboardData;
  mode: "demo" | "live";
}> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return { data: demoDashboardData, mode: "demo" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: demoDashboardData, mode: "demo" };
  }

  // Live aggregation will read Supabase views once the hosted project is created.
  return { data: demoDashboardData, mode: "live" };
}
