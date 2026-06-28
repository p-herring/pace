"use client";

import { Camera, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Avatar } from "@/components/avatar";
import {
  AVATAR_BUCKET,
  avatarPathFromPublicUrl,
  avatarStoragePath,
  prepareAvatarFile,
  validateAvatarFile,
} from "@/lib/avatar-upload";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

type AvatarUploaderProps = {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
};

export function AvatarUploader({ userId, displayName, avatarUrl }: AvatarUploaderProps) {
  const inputId = useId();
  const router = useRouter();
  const [currentUrl, setCurrentUrl] = useState(avatarUrl ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function uploadAvatar(file: File) {
    setError(null);

    const validationError = validateAvatarFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const supabase = getBrowserSupabaseClient();
    if (!supabase) {
      setError("Avatar uploads will work once the Pace database is configured.");
      return;
    }

    setIsUploading(true);
    let nextPreviewUrl: string | null = null;
    let nextPath: string | null = null;

    try {
      const prepared = await prepareAvatarFile(file);
      nextPreviewUrl = prepared.previewUrl;
      setPreviewUrl(nextPreviewUrl);

      nextPath = avatarStoragePath(userId);
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(nextPath, prepared.file, {
          contentType: prepared.file.type,
          cacheControl: "31536000",
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(nextPath);
      const nextUrl = publicUrlData.publicUrl;

      const { error: profileError } = await supabase
        .from("pace_profiles")
        .update({ avatar_url: nextUrl })
        .eq("id", userId);
      if (profileError) throw profileError;

      const previousPath = avatarPathFromPublicUrl(currentUrl);
      if (previousPath?.startsWith(`${userId}/`)) {
        await supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);
      }

      setCurrentUrl(nextUrl);
      router.refresh();
    } catch (uploadError) {
      if (nextPath) {
        await supabase.storage.from(AVATAR_BUCKET).remove([nextPath]);
      }
      setError(uploadError instanceof Error ? uploadError.message : "We couldn’t upload that photo. Try again.");
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="avatar-upload" aria-labelledby={`${inputId}-title`}>
      <div className="avatar-upload-preview">
        <Avatar name={displayName || "Pace member"} avatarUrl={previewUrl ?? currentUrl} size={72} />
      </div>
      <div className="avatar-upload-copy">
        <h2 id={`${inputId}-title`}>Profile picture</h2>
        <p>Upload a clear face or friendly marker. We’ll resize it before saving.</p>
        {error ? <p className="form-error">{error}</p> : null}
        <label className="pace-secondary avatar-upload-button" htmlFor={inputId} aria-busy={isUploading}>
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {currentUrl || previewUrl ? "Replace photo" : "Add photo"}
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={isUploading}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) void uploadAvatar(file);
            }}
          />
        </label>
      </div>
    </section>
  );
}
