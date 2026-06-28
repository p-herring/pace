import Link from "next/link";
import {
  Activity,
  Bike,
  CalendarDays,
  Camera,
  Droplets,
  Flame,
  Gauge,
  LogIn,
  Plus,
  Scale,
  TrendingDown,
  TrendingUp,
  Waves,
} from "lucide-react";
import { getDashboardData } from "@/lib/dashboard";
import type { MetricSnapshot } from "@/lib/types";

export const dynamic = "force-dynamic";

const metricIcon = (metric: MetricSnapshot) => {
  if (metric.kind === "bodyweight") return Scale;
  if (metric.kind === "ftp") return Bike;
  if (metric.kind === "css") return Waves;
  if (metric.kind === "running_threshold") return Gauge;
  return metric.trend === "down" ? TrendingDown : TrendingUp;
};

const formatEventDate = (value: string) =>
  new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));

export default async function Home() {
  const { data, mode } = await getDashboardData();
  const waterProgress = Math.min(
    100,
    Math.round((data.wellness.waterLitres / data.wellness.waterTargetLitres) * 100),
  );

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-4 text-[var(--foreground)] md:px-6">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-5 py-4 shadow-[var(--shadow)]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">
              Comeback OS
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal md:text-5xl">
              {data.athleteName} dashboard
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--signal-soft)] px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--signal)]">
              {mode === "live" ? "Supabase live" : "Demo data"}
            </span>
            <Link
              href="/login"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 text-sm font-black"
            >
              <LogIn className="h-4 w-4" />
              Login
            </Link>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[0.86fr_1.14fr]">
          <div className="rounded-lg border border-[var(--line)] bg-[var(--ink)] p-6 text-white shadow-[var(--shadow)]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/55">
              Current focus
            </p>
            <h2 className="mt-4 text-5xl font-black leading-[0.9] tracking-normal md:text-7xl">
              {data.eventFocus}
            </h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-white/8 p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-white/50">
                  Event date
                </p>
                <p className="mt-3 text-2xl font-black">{formatEventDate(data.eventDate)}</p>
              </div>
              <div className="rounded-lg bg-white/8 p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-white/50">
                  Build week
                </p>
                <p className="mt-3 text-2xl font-black">Week {data.weekNumber}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">
                    Next training
                  </p>
                  <h2 className="mt-2 text-2xl font-black">Coming up</h2>
                </div>
                <Link
                  href="/training-plan"
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 text-sm font-black"
                >
                  <CalendarDays className="h-4 w-4 text-[var(--blue)]" />
                  Add plan
                </Link>
              </div>
              <div className="mt-5 space-y-3">
                {data.plannedWorkouts.map((workout) => (
                  <article key={workout.id} className="rounded-lg border border-[var(--line)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black">{workout.title}</p>
                        <p className="mt-1 text-xs font-bold text-[var(--muted)]">
                          {workout.sport} / {workout.duration} / {workout.intensity}
                        </p>
                      </div>
                      <span className="rounded-full bg-[var(--paper)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                        {workout.source}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">
                    {data.activitySummary.source} snapshot
                  </p>
                  <h2 className="mt-2 text-2xl font-black">Last 7 days</h2>
                </div>
                <Activity className="h-5 w-5 text-[var(--signal)]" />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <MiniStat label="Sessions" value={String(data.activitySummary.sessions)} />
                <MiniStat label="Hours" value={`${data.activitySummary.hours}`} />
                <MiniStat label="Distance" value={`${data.activitySummary.distanceKm} km`} />
                <MiniStat label="Elevation" value={`${data.activitySummary.elevationM} m`} />
              </div>
            </section>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">
                  Change markers
                </p>
                <h2 className="mt-2 text-2xl font-black">Baseline comparisons</h2>
              </div>
              <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--ink)] px-3 text-sm font-black text-white">
                <Plus className="h-4 w-4" />
                Add marker
              </button>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.metrics.map((metric) => {
                const Icon = metricIcon(metric);
                return (
                  <article key={metric.id} className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">
                        {metric.label}
                      </p>
                      <Icon className="h-4 w-4 text-[var(--blue)]" />
                    </div>
                    <p className="mt-4 text-3xl font-black">{metric.value}</p>
                    <p className="mt-2 text-sm font-bold text-[var(--muted)]">
                      {metric.delta} since {metric.since}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4">
            <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">
                Today
              </p>
              <h2 className="mt-2 text-2xl font-black">Fuel and recovery</h2>
              <div className="mt-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm font-black">
                    <span className="inline-flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-[var(--blue)]" />
                      Water
                    </span>
                    <span>
                      {data.wellness.waterLitres} / {data.wellness.waterTargetLitres} L
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-[var(--paper)]">
                    <div className="h-2 rounded-full bg-[var(--blue)]" style={{ width: `${waterProgress}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-[var(--line)] p-4">
                  <span className="inline-flex items-center gap-2 text-sm font-black">
                    <Flame className="h-4 w-4 text-[var(--gold)]" />
                    Daily calories
                  </span>
                  <span className="text-sm font-black">
                    {data.wellness.caloriesHit ? "Hit" : "Not yet"}
                  </span>
                </div>
                <MiniStat label="Readiness" value={`${data.wellness.readiness}%`} />
                {data.wellness.sleepHours ? (
                  <MiniStat
                    label={`Sleep${data.wellness.sleepSource ? ` / ${data.wellness.sleepSource}` : ""}`}
                    value={`${data.wellness.sleepHours} h`}
                  />
                ) : null}
                {data.wellness.hrvMs ? <MiniStat label="HRV" value={`${data.wellness.hrvMs} ms`} /> : null}
                {data.wellness.restingHeartRate ? (
                  <MiniStat label="Resting HR" value={`${data.wellness.restingHeartRate} bpm`} />
                ) : null}
                {data.wellness.painFlag ? <MiniStat label="Pain check" value={data.wellness.painFlag} /> : null}
              </div>
            </section>

            {data.photos.length > 0 ? (
              <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)]">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black">Photos</h2>
                  <Camera className="h-5 w-5 text-[var(--blue)]" />
                </div>
                <div className="mt-4 grid gap-3">
                  {data.photos.map((photo) => (
                    <figure key={photo.id} className="overflow-hidden rounded-lg border border-[var(--line)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt={photo.caption} className="aspect-[4/3] w-full object-cover" />
                      <figcaption className="p-3 text-sm font-bold text-[var(--muted)]">{photo.caption}</figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </section>

        <section className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--shadow)]">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">
            Build queue
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {data.nextActions.map((action) => (
              <div key={action} className="rounded-lg border border-[var(--line)] bg-white p-4 text-sm font-bold leading-6 text-[var(--muted)]">
                {action}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}
