import Link from "next/link";
import { SignUpForm } from "@/components/sign-up-form";

export default async function PaceSignUp({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="app-auth">
      <Link href="/" className="app-auth-logo">
        muster<span>.</span>
      </Link>
      <h1>Meet good people. Move together.</h1>
      <p className="app-auth-sub">Beta for running, cycling and swimming around Perth.</p>
      <SignUpForm error={error} />
    </main>
  );
}
