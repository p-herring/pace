import Link from "next/link";
import { CheckEmailPanel } from "@/components/check-email-panel";

export default async function CheckEmail({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <main className="app-auth">
      <Link href="/" className="app-auth-logo">
        muster<span>.</span>
      </Link>
      <h1>Check your inbox.</h1>
      <p className="app-auth-sub">
        We sent a verification link to {email || "your email"}. Open it to complete your Muster profile.
      </p>
      <div style={{ flex: 1 }}>
        <CheckEmailPanel email={email ?? ""} />
      </div>
      <div className="app-auth-footer">
        Already verified? <Link href="/muster/sign-in" className="app-auth-link">Sign in</Link>
      </div>
    </main>
  );
}
