import Link from "next/link";

const sections = [
  ["Public first", "Meet at public, lawful places such as trailheads, parks, pools, beach access points and cafes. Never use a home address or private residence as a meeting place."],
  ["Join clearly", "Plans state the sport, time, pace, distance, capacity and conditions. Full plans use a first-in, first-out waitlist."],
  ["Be kind and safe", "No harassment, discrimination, intimidation, spam or unwanted attention. Anyone can leave an activity at any time and use block/report controls."],
  ["Own your decision", "Pace connects people; it does not organise, supervise or insure activities. Check conditions, equipment and your own readiness before you go."],
];

export default function Policies() { return <main className="policy-page"><Link href="/pace/sign-up" className="pace-logo">pace<span>.</span></Link><p className="pace-kicker">Pace beta</p><h1>Community and safety policies</h1><p className="policy-lead">A short, practical agreement for people meeting to run, ride and swim together.</p><div className="policy-sections">{sections.map(([title, body]) => <section key={title}><h2>{title}</h2><p>{body}</p></section>)}</div><p className="policy-footer">By using Pace, you agree to follow these policies and make considerate decisions for yourself and others.</p></main>; }
