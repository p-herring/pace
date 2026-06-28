"use client";

import Link from "next/link";
import { Camera } from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import { paceSignUpAction } from "@/app/actions/muster";
import { prepareAvatarFile, setFileInputFile, validateAvatarFile } from "@/lib/avatar-upload";

export function SignUpForm({ error }: { error?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const hiddenAvatarRef = useRef<HTMLInputElement>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const isSubmittingRef = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (isSubmittingRef.current || !selectedAvatar) return;
    event.preventDefault();
    setIsPreparing(true);
    setAvatarError(null);
    try {
      const prepared = await prepareAvatarFile(selectedAvatar);
      if (hiddenAvatarRef.current) setFileInputFile(hiddenAvatarRef.current, prepared.file);
      isSubmittingRef.current = true;
      formRef.current?.requestSubmit();
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : "Couldn't prepare that photo.");
      setIsPreparing(false);
    }
  }

  return (
    <form ref={formRef} action={paceSignUpAction} onSubmit={handleSubmit} className="app-auth-form">
      {error && <div className="app-alert app-alert-error">{error}</div>}

      <input className="app-auth-input" name="displayName" placeholder="First name or display name" required maxLength={40} />

      <div>
        <input className="app-auth-input" name="username" placeholder="Username" required minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]+" autoCapitalize="none" autoComplete="username" />
        <span style={{ fontSize: 12, color: "var(--app-muted)", marginTop: 6, display: "block" }}>Letters, numbers and underscores only.</span>
      </div>

      <input className="app-auth-input" name="email" type="email" placeholder="Email" autoComplete="email" required />
      <input className="app-auth-input" name="password" type="password" placeholder="Password (8+ characters)" autoComplete="new-password" minLength={8} required />

      {/* Avatar picker */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, background: "var(--app-card)", borderRadius: 14, padding: "14px 16px" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", overflow: "hidden", background: "var(--app-card-2)", display: "grid", placeItems: "center", flexShrink: 0, color: "var(--app-muted)" }}>
          {avatarPreviewUrl
            ? <img src={avatarPreviewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <Camera size={20} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "var(--app-ink)" }}>
            Profile photo <span style={{ color: "var(--app-muted)", fontWeight: 500 }}>optional</span>
          </p>
          {avatarError && <p style={{ margin: "0 0 6px", fontSize: 12, color: "#ff6b6b" }}>{avatarError}</p>}
          <label style={{ display: "inline-block", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "var(--app-accent)" }}>
            {selectedAvatar ? "Change photo" : "Add photo"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
              onChange={(e) => {
                const file = e.currentTarget.files?.[0] ?? null;
                if (!file) return;
                const err = validateAvatarFile(file);
                if (err) { setAvatarError(err); setSelectedAvatar(null); setAvatarPreviewUrl(null); return; }
                setAvatarError(null);
                setSelectedAvatar(file);
                setAvatarPreviewUrl(URL.createObjectURL(file));
              }}
            />
          </label>
        </div>
        <input ref={hiddenAvatarRef} type="file" name="avatar" hidden aria-hidden tabIndex={-1} />
      </div>

      {/* Terms */}
      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "var(--app-muted)", fontWeight: 500, margin: 0, lineHeight: 1.5 }}>
        <input name="terms" type="checkbox" required style={{ width: "auto", marginTop: 2, accentColor: "var(--app-accent)", flexShrink: 0 }} />
        <span>
          I'm 18+ and agree to the Muster{" "}
          <Link href="/policies" target="_blank" className="app-auth-link">policies</Link>
          {" "}and{" "}
          <Link href="/privacy" target="_blank" className="app-auth-link">privacy policy</Link>.
        </span>
      </label>

      <button className="app-auth-submit" type="submit" aria-busy={isPreparing} disabled={isPreparing}>
        {isPreparing ? "Preparing…" : "Create account"}
      </button>

      <div className="app-auth-footer">
        Already have an account? <Link href="/muster/sign-in" className="app-auth-link">Sign in</Link>
      </div>
    </form>
  );
}
