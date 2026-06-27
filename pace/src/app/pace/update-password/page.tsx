import { UpdatePasswordForm } from "@/components/auth-client";
import { PaceAuthBrand } from "@/components/pace-auth-brand";

export default function PaceUpdatePassword() {
  return (
    <main className="pace-auth">
      <PaceAuthBrand />
      <section>
        <p className="pace-kicker">Almost done</p>
        <h1>Set a fresh password.</h1>
        <p>Pick something you haven’t used before, then head back in to your plans.</p>
      </section>
      <UpdatePasswordForm />
    </main>
  );
}
