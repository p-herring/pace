import { redirect } from "next/navigation";
import { paceReportPlanAction } from "@/app/actions/muster";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const reasons: Array<[string, string]> = [
  ["safety", "Safety concern"],
  ["harassment", "Harassment"],
  ["inappropriate_content", "Inappropriate content"],
  ["spam", "Spam"],
  ["impersonation", "Impersonation"],
  ["other", "Other"],
];

export default async function ReportPlan({
  params,
  searchParams,
}: {
  params: Promise<{ planId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { planId } = await params;
  const { error } = await searchParams;

  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/muster");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/muster/sign-in");

  const { data: plan } = await supabase
    .from("pace_plans")
    .select("id,title,host_id")
    .eq("id", planId)
    .maybeSingle();

  if (!plan) redirect("/muster");

  return (
    <main className="muster-app">
      
      <div className="muster-auth">
        <section>
        <p className="muster-kicker">Report a plan</p>
        <h1>{plan.title}</h1>
        <p>
          Tell us what’s wrong. Reports go to a beta admin for human review — if there’s
          an immediate safety risk, contact local emergency services first.
        </p>
      </section>
      <form action={paceReportPlanAction}>
        <h2>What happened?</h2>
        <input type="hidden" name="planId" value={plan.id} />
        <input type="hidden" name="hostId" value={plan.host_id} />
        {error && <p className="form-error">{error}</p>}
        <fieldset>
          <legend>Reason</legend>
          {reasons.map(([value, label]) => (
            <label className="check" key={value}>
              <input type="radio" name="reason" value={value} required /> {label}
            </label>
          ))}
        </fieldset>
        <label>
          Details (optional)
          <textarea name="details" rows={4} maxLength={2000} />
        </label>
        <button className="muster-primary" type="submit">
          Submit report
        </button>
      </form>
      </div>
    </main>
  );
}
