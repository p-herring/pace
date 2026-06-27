"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
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
      setFeedback("The Pace database is not configured yet.");
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

    router.push("/pace/sign-in?message=Password updated. You can sign in now.");
  }

  return (
    <form onSubmit={onSubmit}>
      <h2>Choose a new password</h2>
      {feedback && <p className={isError ? "form-error" : "form-success"}>{feedback}</p>}
      <label>
        New password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
        />
      </label>
      <label>
        Confirm password
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Repeat the new password"
        />
      </label>
      <button className="pace-primary" type="submit" disabled={isBusy}>
        Save password <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}
