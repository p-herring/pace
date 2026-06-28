"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!password || password.length < 8) {
      setIsError(true);
      setFeedback("Use at least eight characters.");
      return;
    }

    if (password !== confirmPassword) {
      setIsError(true);
      setFeedback("Passwords need to match.");
      return;
    }

    const supabase = getBrowserSupabaseClient();
    if (!supabase) {
      setIsError(false);
      setFeedback("The Muster database is not configured yet.");
      return;
    }

    setIsBusy(true);
    setIsError(false);
    setFeedback("Updating password...");

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setIsError(true);
      setFeedback(error.message);
      setIsBusy(false);
      return;
    }

    router.push("/muster/sign-in?message=Password updated. You can sign in now.");
  }

  return (
    <form onSubmit={onSubmit} className="app-auth-form">
      {feedback && <div className={isError ? "app-alert app-alert-error" : "app-alert app-alert-success"}>{feedback}</div>}
      <input
        className="app-auth-input"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="New password (8+ characters)"
        autoComplete="new-password"
      />
      <input
        className="app-auth-input"
        type="password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        placeholder="Confirm new password"
        autoComplete="new-password"
      />
      <button className="app-auth-submit" type="submit" disabled={isBusy}>
        Save password
      </button>
    </form>
  );
}
