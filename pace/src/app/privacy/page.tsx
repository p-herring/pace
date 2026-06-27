import Link from "next/link";

const sections: Array<[string, string[]]> = [
  [
    "What we collect",
    [
      "Account basics: email address, password (hashed by Supabase Auth, never stored in plain text), and display name.",
      "Profile details you add: suburb, sports and experience level, and an optional bio/avatar.",
      "Location: an approximate location if you enable radius-based discovery, plus the location of plans you host or join — public listings only ever show a suburb-level point; exact meeting points are only visible to confirmed participants and the host.",
      "Content you create: plans, messages within a plan, community reports, and block lists.",
      "Standard technical data: IP address and basic request logs, used for security purposes like rate-limiting sign-in attempts.",
    ],
  ],
  [
    "What we don't collect",
    [
      "We don’t verify identity beyond email confirmation and self-reported age — see the community policy for details.",
      "We don’t track you outside the app, and we don’t sell personal data to third parties or advertisers.",
    ],
  ],
  [
    "How we use it",
    [
      "To run the core product: matching you with plans, showing relevant discovery results, and enabling messaging between confirmed participants.",
      "To keep the community safe: reviewing reports, applying blocks, and — where there’s a credible safety concern — restricting an account while we look into it.",
      "To operate the service: authentication, abuse prevention, and debugging.",
    ],
  ],
  [
    "Who can see what",
    [
      "Your display name and sport preferences are visible to other signed-in members.",
      "Your exact location for a plan is visible only to the host and confirmed participants of that specific plan — never to the public, and never to people who haven’t joined.",
      "Messages inside a plan are visible only to the host and confirmed participants of that plan.",
    ],
  ],
  [
    "Your choices",
    [
      "You can edit your profile, leave any plan, and block or report another member at any time.",
      "You can delete your account from Account settings — this permanently removes your profile, plans, messages and notifications. See /pace/account.",
    ],
  ],
];

export default function PrivacyPolicy() {
  return (
    <main className="policy-page">
      <Link href="/" className="pace-logo">
        pace<span>.</span>
      </Link>
      <p className="pace-kicker">Pace beta</p>
      <h1>Privacy policy</h1>
      <p className="policy-lead">
        This page describes, in plain language, what Pace collects and how it’s used. It
        is a working draft for the closed beta and has not yet had a formal legal review —
        treat it as an accurate description of current behaviour, not as a finished legal
        document.
      </p>
      <div className="policy-sections">
        {sections.map(([title, items]) => (
          <section key={title}>
            <h2>{title}</h2>
            <ul>
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="policy-footer">
        Questions about your data? Contact beta support (see{" "}
        <Link href="/policies" className="policy-link">
          community &amp; safety policies
        </Link>{" "}
        for how reports and account issues are handled in the meantime).
      </p>
    </main>
  );
}
