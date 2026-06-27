import Link from "next/link";
import { paceDeleteAccountAction } from "@/app/actions/pace";
import { PaceHeader } from "@/components/pace-header";

export default async function PaceDeleteAccount({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="pace-app">
      <PaceHeader />
      <div className="pace-auth">
        <section>
        <p className="pace-kicker">This can’t be undone</p>
        <h1>Delete your Pace account.</h1>
        <p>
          We’ll cancel any plans you’re hosting and notify anyone who joined them, then
          permanently remove your profile, plans, messages and notifications. People you’ve
          met through Pace keep their own data.
        </p>
      </section>
      <form action={paceDeleteAccountAction}>
        <h2>Confirm deletion</h2>
        {error && <p className="form-error">{error}</p>}
        <label>
          Type <strong>delete my account</strong> to confirm
          <input name="confirm" required placeholder="delete my account" />
        </label>
        <button className="pace-danger-button" type="submit">
          Permanently delete my account
        </button>
        <p>
          <Link href="/pace/account" className="policy-link">
            Cancel, take me back
          </Link>
        </p>
      </form>
      </div>
    </main>
  );
}
