import Link from "next/link";
import { paceDeleteAccountAction } from "@/app/actions/muster";

export default async function PaceDeleteAccount({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="muster-app">
      
      <div className="muster-auth">
        <section>
        <p className="muster-kicker">This can’t be undone</p>
        <h1>Delete your Muster account.</h1>
        <p>
          We’ll cancel any plans you’re hosting and notify anyone who joined them, then
          permanently remove your profile, plans, messages and notifications. People you’ve
          met through Muster keep their own data.
        </p>
      </section>
      <form action={paceDeleteAccountAction}>
        <h2>Confirm deletion</h2>
        {error && <p className="form-error">{error}</p>}
        <label>
          Type <strong>delete my account</strong> to confirm
          <input name="confirm" required placeholder="delete my account" />
        </label>
        <button className="muster-danger-button" type="submit">
          Permanently delete my account
        </button>
        <p>
          <Link href="/muster/account" className="policy-link">
            Cancel, take me back
          </Link>
        </p>
      </form>
      </div>
    </main>
  );
}
