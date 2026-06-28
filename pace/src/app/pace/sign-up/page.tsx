import { PaceAuthBrand } from "@/components/pace-auth-brand";
import { SignUpForm } from "@/components/sign-up-form";

export default async function PaceSignUp({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="pace-auth">
      <PaceAuthBrand />
      <section>
        <p className="pace-kicker">Pace beta · Perth</p>
        <h1>Meet good people. Move together.</h1>
        <p>Invite-only beta for running, cycling and swimming in public places.</p>
      </section>
      <SignUpForm error={error} />
    </main>
  );
}
