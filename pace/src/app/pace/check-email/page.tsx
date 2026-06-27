import Link from "next/link";
import { CheckEmailPanel } from "@/components/check-email-panel";
import { PaceAuthBrand } from "@/components/pace-auth-brand";

export default async function CheckEmail({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return <main className="pace-auth"><PaceAuthBrand /><section><p className="pace-kicker">One last thing</p><h1>Check your inbox.</h1><p>We sent a verification link to {email || "your email"}. Open it to complete your Pace profile.</p><p>Already have a Pace account? <Link href="/pace/sign-in" className="policy-link">Sign in instead</Link>.</p></section><CheckEmailPanel email={email ?? ""} /></main>;
}
