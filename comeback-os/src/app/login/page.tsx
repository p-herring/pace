import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { signInAction } from "@/app/actions/auth";
import { hasSupabase } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)]">
      <section className="mx-auto grid min-h-[calc(100vh-48px)] max-w-6xl items-center gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-8 shadow-[var(--shadow)] md:p-12">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">
            Comeback OS
          </p>
          <h1 className="mt-5 max-w-xl text-6xl font-black leading-[0.88] tracking-normal md:text-8xl">
            Private dashboard. Public proof later.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--muted)] md:text-lg">
            Log training, connect activity sources, track the markers that matter, and decide what becomes visible when the work has earned it.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--line)] bg-white p-6 shadow-[var(--shadow)]">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--ink)] text-white">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <h2 className="mt-5 text-2xl font-black">Sign in</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {hasSupabase
              ? "Enter your email and Supabase will send a magic link."
              : "Supabase is not connected yet, so demo mode opens the dashboard locally."}
          </p>

          <form action={signInAction} className="mt-6 space-y-3">
            <label className="block text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              className="h-12 w-full rounded-lg border border-[var(--line)] px-4 text-sm outline-none transition focus:border-[var(--ink)]"
            />
            <button className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--ink)] px-4 text-sm font-black text-white">
              Send magic link
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <Link
            href="/"
            className="mt-3 flex h-12 w-full items-center justify-center rounded-lg border border-[var(--line)] px-4 text-sm font-black"
          >
            Open demo dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
