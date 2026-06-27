import { Sparkles, MapPin } from "lucide-react";
import { SPORT, SPORT_ORDER } from "@/lib/sport";

const sportCopy: Record<string, string> = {
  run: "From easy morning loops to tempo sessions — find a pace that matches yours.",
  ride: "Social spins, gravel grinds or a fast bunch ride. Pick your group, pick your effort.",
  swim: "Pool sets and open water, hosted by people who already know the conditions.",
};

export default function Home() {
  return (
    <main className="pace-shell min-h-screen">
      <header className="pace-header">
        <a href="#top" className="pace-logo" aria-label="Pace home">
          pace<span>.</span>
        </a>
        <nav className="hidden items-center gap-7 text-sm font-semibold text-pace-muted md:flex">
          <a href="#sports" className="hover:text-pace-ink">Sports</a>
          <a href="#how" className="hover:text-pace-ink">How it works</a>
        </nav>
        <div className="flex items-center gap-3">
          <a href="/pace/sign-in" className="pace-text hidden sm:inline">Sign in</a>
          <a href="/pace/sign-up" className="pace-primary">Join the beta</a>
        </div>
      </header>

      <section id="top" className="pace-hero">
        <div className="max-w-2xl">
          <p className="pace-kicker">
            <Sparkles className="h-4 w-4" /> Now in beta
          </p>
          <h1>Find your people to move with.</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-pace-muted">
            Pace turns &ldquo;I want to do something&rdquo; into &ldquo;we&rsquo;re going.&rdquo; Post a run, ride or
            swim, set the time and place, and meet people who move at your pace.
          </p>
          <div className="pace-hero-actions">
            <a href="/pace/sign-up" className="pace-primary">Join the beta</a>
            <a href="#how" className="pace-secondary">See how it works</a>
          </div>
          <p className="mt-6 flex items-center gap-2 text-sm font-semibold text-pace-muted">
            <MapPin className="h-4 w-4 text-pace-primary" /> Starting in Perth, WA
          </p>
        </div>

        <div id="sports" className="sport-tiles">
          {SPORT_ORDER.map((sport) => {
            const { Icon, label } = SPORT[sport];
            return (
              <div className="sport-tile" key={sport}>
                <span className={`sport-tile-icon ${sport}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <h3>{label}</h3>
                <p>{sportCopy[sport]}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <p className="pace-kicker">Simple by design</p>
        <div className="mt-4 grid gap-8 md:grid-cols-3">
          <Step n="01" title="Share your plan" text="Set the sport, place, time, pace and distance. No awkward ambiguity." />
          <Step n="02" title="Find a fit" text="See plans from people moving on your schedule, at your effort." />
          <Step n="03" title="Move together" text="Join the plan and meet at the start line — the exact spot unlocks once you're confirmed." />
        </div>
      </section>

      <section className="cta-band">
        <h2>Ready to find your next run, ride or swim?</h2>
        <p>Pace is in beta around Perth. Join now and help shape it as it grows.</p>
        <a href="/pace/sign-up" className="pace-primary">Join the beta</a>
      </section>
    </main>
  );
}

function Step({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div className="step">
      <span>{n}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
