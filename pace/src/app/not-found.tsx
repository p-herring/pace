import Link from "next/link";

export default function NotFound() {
  return (
    <main className="muster-app">
      <div className="muster-empty">
        <h2>This route doesn’t exist.</h2>
        <p>Whatever you were looking for isn’t here — but there’s probably a plan worth joining.</p>
        <Link className="muster-primary" href="/muster">
          Back to Muster
        </Link>
      </div>
    </main>
  );
}
