"use client";

import { useEffect, useState } from "react";
import { MailCheck, RotateCw } from "lucide-react";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

const RESEND_WAIT_SECONDS = 20;

export function CheckEmailPanel({ email }: { email: string }) {
  const [seconds, setSeconds] = useState(RESEND_WAIT_SECONDS);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  async function resend() {
    const supabase = getBrowserSupabaseClient();
    if (!supabase || !email) return;
    setState("sending");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/muster/onboarding` },
    });
    if (error) {
      setState("error");
      setMessage(error.message);
      return;
    }
    setState("sent");
    setMessage("Another verification email is on its way.");
    setSeconds(RESEND_WAIT_SECONDS);
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--app-card)", display: "grid", placeItems: "center", color: "var(--app-accent)" }}>
        <MailCheck size={28} aria-hidden="true" />
      </div>
      <p style={{ margin: 0, color: "var(--app-ink)", fontSize: 15 }}>
        We sent a link to <strong>{email || "your inbox"}</strong>. It can take a minute or two to arrive.
      </p>
      <p style={{ margin: 0, color: "var(--app-muted)", fontSize: 14 }}>
        Check your spam or promotions folder before requesting another one.
      </p>
      {message && (
        <div className={state === "error" ? "app-alert app-alert-error" : "app-alert app-alert-success"} role="status">
          {message}
        </div>
      )}
      <button
        type="button"
        className="app-auth-submit"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: (seconds > 0 || state === "sending" || !email) ? 0.5 : 1 }}
        disabled={seconds > 0 || state === "sending" || !email}
        onClick={resend}
      >
        <RotateCw size={16} />
        {state === "sending" ? "Sending…" : seconds > 0 ? `Resend in ${seconds}s` : "Resend verification email"}
      </button>
    </section>
  );
}
