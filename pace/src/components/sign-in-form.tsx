"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { paceSignInAction } from "@/app/actions/muster";

const rememberedEmailKey = "muster.remembered-email";

export function SignInForm({ error, next }: { error?: string; next?: string }) {
  const [identifier, setIdentifier] = useState("");
  const [rememberEmail, setRememberEmail] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = window.localStorage.getItem(rememberedEmailKey);
      if (saved) { setIdentifier(saved); setRememberEmail(true); }
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
    <form action={paceSignInAction} onSubmit={remember} className="app-auth-form">
      <input type="hidden" name="next" value={next ?? "/muster"} />

      {error && <div className="app-alert app-alert-error">{error}</div>}

      <div>
        <input
          className="app-auth-input"
          name="identifier"
          type="text"
          placeholder="Email or username"
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />
      </div>

      <div>
        <input
          className="app-auth-input"
          name="password"
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          required
        />
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--app-muted)", fontWeight: 600, margin: 0 }}>
        <input
          type="checkbox"
          checked={rememberEmail}
          onChange={(e) => setRememberEmail(e.target.checked)}
          style={{ width: "auto", accentColor: "var(--app-accent)" }}
        />
        Remember my email on this device
      </label>

      <button className="app-auth-submit" type="submit">
        Sign in
      </button>

      <div className="app-auth-footer">
        <Link href="/muster/forgot-password" className="app-auth-link">Forgot password?</Link>
        {" · "}
        <Link href="/muster/sign-up" className="app-auth-link">Join the beta</Link>
      </div>
    </form>
  );
}
