import { UpdatePasswordForm } from "@/components/auth-client";
import Link from "next/link";

export default function MusterUpdatePassword() {
  return (
    <main className="app-auth">
      <Link href="/" className="app-auth-logo">
        muster<span>.</span>
      </Link>
      <h1>Set a fresh password.</h1>
      <p className="app-auth-sub">Pick something you haven't used before, then head back in to your plans.</p>
      <UpdatePasswordForm />
    </main>
  );
}
