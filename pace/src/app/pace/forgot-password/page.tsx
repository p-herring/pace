import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { paceForgotPasswordAction } from "@/app/actions/pace";
import { PaceAuthBrand } from "@/components/pace-auth-brand";

export default async function PaceForgotPassword({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="pace-auth">
      <PaceAuthBrand />
      <section>
        <p className="pace-kicker">Account recovery</p>
        <h1>Reset your password.</h1>
        <p>
          Enter the email on your Pace account and we’ll send a link that brings you
          back here to choose a new password.
        </p>
      </section>
      <form action={paceForgotPasswordAction}>
        <h2>Forgot password</h2>
        {error && <p className="form-error">{error}</p>}
        {message && <p className="form-success">{message}</p>}
        <label>
          Account email
          <input name="email" type="email" required />
        </label>
        <button className="pace-primary" type="submit">
          Send reset link <ArrowRight className="h-4 w-4" />
        </button>
        <p>
          <Link href="/pace/sign-in" className="policy-link">
            Back to sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
