"use client";

import Link from "next/link";
import { Camera, Loader2 } from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import { paceSignUpAction } from "@/app/actions/pace";
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
    if (isSubmittingRef.current) {
      return;
    }

    if (!selectedAvatar) {
      return;
    }

    event.preventDefault();
    setIsPreparing(true);
    setAvatarError(null);

    try {
      const prepared = await prepareAvatarFile(selectedAvatar);
      if (hiddenAvatarRef.current) {
        setFileInputFile(hiddenAvatarRef.current, prepared.file);
      }
      isSubmittingRef.current = true;
      formRef.current?.requestSubmit();
    } catch (prepareError) {
      setAvatarError(prepareError instanceof Error ? prepareError.message : "We couldn’t prepare that photo.");
      setIsPreparing(false);
    }
  }

  return (
    <form ref={formRef} action={paceSignUpAction} onSubmit={handleSubmit}>
      <h2>Join the beta</h2>
      {error && <p className="form-error">{error}</p>}
      <label>
        First name or display name
        <input name="displayName" required maxLength={40} />
      </label>
      <label>
        Username
        <input name="username" required minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]+" autoCapitalize="none" autoComplete="username" />
        <span className="field-hint">Letters, numbers and underscores only. This is how people can find you.</span>
      </label>
      <label>
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="new-password" minLength={8} required />
      </label>

      <section className="signup-avatar-step" aria-labelledby="signup-avatar-title">
        <div className="signup-avatar-preview" aria-hidden="true">
          {avatarPreviewUrl ? <img src={avatarPreviewUrl} alt="" /> : <Camera className="h-5 w-5" />}
        </div>
        <div>
          <h3 id="signup-avatar-title">Add a profile picture <span>optional</span></h3>
          <p>Skip it and Pace will use your initials until you add one later.</p>
          {avatarError ? <p className="form-error">{avatarError}</p> : null}
          <label className="pace-secondary signup-avatar-button">
            {selectedAvatar ? "Choose a different photo" : "Choose photo"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0] ?? null;
                if (!file) return;
                const validationError = validateAvatarFile(file);
                if (validationError) {
                  setAvatarError(validationError);
                  setSelectedAvatar(null);
                  setAvatarPreviewUrl(null);
                  return;
                }
                setAvatarError(null);
                setSelectedAvatar(file);
                setAvatarPreviewUrl(URL.createObjectURL(file));
              }}
            />
          </label>
          <input ref={hiddenAvatarRef} type="file" name="avatar" hidden aria-hidden="true" tabIndex={-1} />
        </div>
      </section>

      <label className="check">
        <input name="terms" type="checkbox" required />{" "}
        <span>
          I’m 18+ and agree to the Pace beta{" "}
          <Link href="/policies" target="_blank" className="policy-link">
            policies
          </Link>{" "}
          and{" "}
          <Link href="/privacy" target="_blank" className="policy-link">
            privacy policy
          </Link>
          .
        </span>
      </label>
      <button className="pace-primary" type="submit" aria-busy={isPreparing} disabled={isPreparing}>
        {isPreparing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isPreparing ? "Preparing photo…" : "Create account"}
      </button>
      <p>
        Already in?{" "}
        <Link href="/pace/sign-in" className="auth-inline-link">
          Sign in
        </Link>
      </p>
    </form>
  );
}
