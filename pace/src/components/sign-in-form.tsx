"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { paceSignInAction } from "@/app/actions/pace";

const rememberedEmailKey = "pace.remembered-email";

export function SignInForm({ error, next }: { error?: string; next?: string }) {
  const [identifier, setIdentifier] = useState("");
  const [rememberEmail, setRememberEmail] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedEmail = window.localStorage.getItem(rememberedEmailKey);
      if (savedEmail) {
        setIdentifier(savedEmail);
        setRememberEmail(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function remember() {
    if (rememberEmail && identifier.includes("@")) {
      window.localStorage.setItem(rememberedEmailKey, identifier.trim().toLowerCase());
    } else {
      window.localStorage.removeItem(rememberedEmailKey);
    }
  }

  return (
    <form action={paceSignInAction} onSubmit={remember}>
      <h2>Sign in</h2>
      <input type="hidden" name="next" value={next ?? "/pace"} />
      {error && <p className="form-error">{error}</p>}
      <label>
        Email or username
        <input
          name="identifier"
          type="text"
          autoComplete="username"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          required
        />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      <label className="check remember-email">
        <input
          type="checkbox"
          checked={rememberEmail}
          onChange={(event) => setRememberEmail(event.target.checked)}
        />
        Remember my email on this device
      </label>
      <button className="pace-primary" type="submit">
        Sign in <ArrowRight className="h-4 w-4" />
      </button>
      <p className="auth-secondary-action">
        <Link href="/pace/forgot-password" className="policy-link auth-inline-link">
          Forgot password?
        </Link>
      </p>
      <p>
        New here? <Link href="/pace/sign-up" className="auth-inline-link">Join the beta</Link>
      </p>
    </form>
  );
}
