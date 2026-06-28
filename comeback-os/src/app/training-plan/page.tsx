import Link from "next/link";
import { ArrowLeft, FileSpreadsheet, Plus } from "lucide-react";
import { addManualWorkoutAction, importPlanCsvAction } from "@/app/actions/training-plan";

export const dynamic = "force-dynamic";

const statusCopy: Record<string, string> = {
  added: "Workout added.",
  imported: "Plan imported.",
  demo: "Connect Supabase and sign in before saving workouts.",
  missing: "Date, title, and sport are required.",
  columns: "CSV needs date, title, and sport columns.",
  empty: "No valid workouts found.",
};

export default async function TrainingPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; count?: string }>;
}) {
  const params = await searchParams;
  const status = params.status ? statusCopy[params.status] : null;

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-4 text-[var(--foreground)] md:px-6">
      <div className="mx-auto grid max-w-[1200px] gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-lg border border-[var(--line)] bg-[var(--ink)] p-6 text-white shadow-[var(--shadow)]">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-black text-white/70">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-white/50">
            Training intake
          </p>
          <h1 className="mt-4 text-5xl font-black leading-[0.9] tracking-normal md:text-7xl">
            Get the plan in, however it arrives.
          </h1>
          <p className="mt-6 max-w-xl text-sm font-semibold leading-7 text-white/64">
            COROS and TrainingPeaks API access can be added later. For now, manual entry and CSV import keep the weekly plan moving.
          </p>
          {status ? (
            <div className="mt-6 rounded-lg bg-white/10 p-4 text-sm font-black">
              {status}
              {params.count ? ` ${params.count} workouts saved.` : ""}
            </div>
          ) : null}
        </section>

        <div className="grid gap-4">
          <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">
                  Single workout
                </p>
                <h2 className="mt-2 text-2xl font-black">Manual add</h2>
              </div>
              <Plus className="h-5 w-5 text-[var(--blue)]" />
            </div>

            <form action={addManualWorkoutAction} className="mt-5 grid gap-3 md:grid-cols-2">
              <Field label="Date" name="date" type="date" required />
              <Field label="Sport" name="sport" placeholder="Run, Bike, Swim, Strength" required />
              <Field label="Title" name="title" placeholder="Aerobic run + strides" required wide />
              <Field label="Duration minutes" name="duration_minutes" type="number" placeholder="50" />
              <Field label="Intensity" name="intensity" placeholder="Z2 with 6 x 20 sec" />
              <button className="h-12 rounded-lg bg-[var(--ink)] px-4 text-sm font-black text-white md:col-span-2">
                Save workout
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">
                  Bulk plan
                </p>
                <h2 className="mt-2 text-2xl font-black">CSV paste</h2>
              </div>
              <FileSpreadsheet className="h-5 w-5 text-[var(--signal)]" />
            </div>

            <form action={importPlanCsvAction} className="mt-5 space-y-3">
              <label className="block text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]" htmlFor="csv">
                CSV rows
              </label>
              <textarea
                id="csv"
                name="csv"
                rows={9}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4 font-mono text-sm outline-none transition focus:border-[var(--ink)]"
                defaultValue={`date,title,sport,duration_minutes,intensity
2026-06-14,Aerobic run + strides,Run,50,Z2 with 6 x 20 sec
2026-06-15,Lower strength,Strength,60,RPE 7`}
              />
              <button className="h-12 w-full rounded-lg bg-[var(--ink)] px-4 text-sm font-black text-white">
                Import plan
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required = false,
  wide = false,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "md:col-span-2" : ""}>
      <span className="block text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="mt-2 h-12 w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-4 text-sm outline-none transition focus:border-[var(--ink)]"
      />
    </label>
  );
}
