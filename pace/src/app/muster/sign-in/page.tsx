import Link from "next/link";
import { SignInForm } from "@/components/sign-in-form";

export default async function PaceSignIn({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <main className="app-auth">
      <Link href="/" className="app-auth-logo">
        muster<span>.</span>
      </Link>
      <h1>Good to see you.</h1>
      <p className="app-auth-sub">Sign back in to see your plans and who you're moving with.</p>
      <SignInForm error={error} next={next} />
    </main>
  );
}
