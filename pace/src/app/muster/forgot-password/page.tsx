import Link from "next/link";
import { paceForgotPasswordAction } from "@/app/actions/muster";

export default async function PaceForgotPassword({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="app-auth">
      <Link href="/" className="app-auth-logo">
        muster<span>.</span>
      </Link>
      <h1>Reset your password.</h1>
      <p className="app-auth-sub">We'll send a link to your email so you can choose a new one.</p>

      <form action={paceForgotPasswordAction} className="app-auth-form">
        {error && <div className="app-alert app-alert-error">{error}</div>}
        {message && <div className="app-alert app-alert-success">{message}</div>}

        <input className="app-auth-input" name="email" type="email" placeholder="Account email" required />

        <button className="app-auth-submit" type="submit">Send reset link</button>

        <div className="app-auth-footer">
          <Link href="/muster/sign-in" className="app-auth-link">Back to sign in</Link>
        </div>
      </form>
    </main>
  );
}
