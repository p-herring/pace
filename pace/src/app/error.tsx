"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replace with real error reporting (Sentry, Supabase logs, etc.) before launch.
    console.error("Muster runtime error:", error);
  }, [error]);

  return (
    <main className="muster-app">
      <div className="muster-empty">
        <h2>Something went wrong.</h2>
        <p>That’s on us, not you. Try again — if it keeps happening, give us a moment and come back.</p>
        <button type="button" className="muster-primary" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </main>
  );
}
