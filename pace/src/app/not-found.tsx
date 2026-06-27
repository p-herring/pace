import Link from "next/link";

export default function NotFound() {
  return (
    <main className="pace-app">
      <div className="pace-empty">
        <h2>This route doesn’t exist.</h2>
        <p>Whatever you were looking for isn’t here — but there’s probably a plan worth joining.</p>
        <Link className="pace-primary" href="/pace">
          Back to Pace
        </Link>
      </div>
    </main>
  );
}
