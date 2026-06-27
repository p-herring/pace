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
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/pace/onboarding` },
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

  return <section className="check-email-panel"><MailCheck className="check-email-icon" aria-hidden="true" /><h2>Verify your email</h2><p>We sent a secure confirmation link to <strong>{email || "your inbox"}</strong>. It can take a minute or two to arrive.</p><p className="check-email-tip">Check your spam or promotions folder before requesting another one.</p>{message && <p role="status" className={state === "error" ? "form-error" : "form-success"}>{message}</p>}<button type="button" className="resend-button" disabled={seconds > 0 || state === "sending" || !email} onClick={resend}><RotateCw className="h-4 w-4" />{state === "sending" ? "Sending…" : seconds > 0 ? `Resend available in ${seconds}s` : "Resend verification email"}</button></section>;
}
