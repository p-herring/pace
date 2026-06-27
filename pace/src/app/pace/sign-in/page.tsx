import { PaceAuthBrand } from "@/components/pace-auth-brand";
import { SignInForm } from "@/components/sign-in-form";

export default async function PaceSignIn({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <main className="pace-auth">
      <PaceAuthBrand />
      <section>
        <p className="pace-kicker">Pace beta · Perth</p>
        <h1>Good to see you again.</h1>
        <p>
          Sign back in to see your plans, manage who you’re moving with, and keep your
          spot on any waitlists.
        </p>
      </section>
      <SignInForm error={error} next={next} />
    </main>
  );
}
