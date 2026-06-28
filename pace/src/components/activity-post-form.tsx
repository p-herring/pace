"use client";

import { Camera, Loader2, X } from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import { paceCreateActivityPostAction } from "@/app/actions/muster";
import { MAX_PHOTOS, prepareActivityPhoto, validateActivityPhoto } from "@/lib/activity-photo-upload";
import { setFileInputFiles } from "@/lib/avatar-upload";

type PastPlan = {
  id: string;
  title: string;
};

type PreviewPhoto = {
  file: File;
  url: string;
};

export function ActivityPostForm({ pastPlans }: { pastPlans: PastPlan[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const hiddenPhotosRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<PreviewPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const isSubmittingRef = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (isSubmittingRef.current || photos.length === 0) return;

    event.preventDefault();
    setIsPreparing(true);
    setError(null);

    try {
      const prepared = await Promise.all(photos.map((photo, index) => prepareActivityPhoto(photo.file, index)));
      if (hiddenPhotosRef.current) setFileInputFiles(hiddenPhotosRef.current, prepared);
      isSubmittingRef.current = true;
      formRef.current?.requestSubmit();
    } catch (prepareError) {
      setError(prepareError instanceof Error ? prepareError.message : "We couldn’t prepare those photos.");
      setIsPreparing(false);
    }
  }

  function addPhotos(files: FileList | null) {
    if (!files?.length) return;

    const next = [...photos];
    for (const file of Array.from(files)) {
      if (next.length >= MAX_PHOTOS) break;
      const validationError = validateActivityPhoto(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      next.push({ file, url: URL.createObjectURL(file) });
    }

    setError(null);
    setPhotos(next);
  }

  return (
    <form ref={formRef} action={paceCreateActivityPostAction} onSubmit={handleSubmit} className="activity-composer">
      <div>
        <p className="muster-kicker">Activity</p>
        <h2>Share a moment</h2>
        <p>Add photos, a caption, or link it to a past plan.</p>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <label>
        Caption
        <textarea name="caption" rows={3} maxLength={1000} placeholder="How did it go?" />
      </label>

      {pastPlans.length ? (
        <label>
          Link to a past plan (optional)
          <select name="planId" defaultValue="">
            <option value="">No plan</option>
            {pastPlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {photos.length ? (
        <div className="activity-photo-preview-grid">
          {photos.map((photo, index) => (
            <div className="activity-photo-preview" key={photo.url}>
              <img src={photo.url} alt="" />
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index))}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="activity-composer-actions">
        <label className="muster-secondary activity-photo-button">
          <Camera className="h-4 w-4" />
          {photos.length ? "Add more photos" : "Add photos"}
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              addPhotos(event.currentTarget.files);
              event.currentTarget.value = "";
            }}
          />
        </label>
        <input ref={hiddenPhotosRef} type="file" name="photos" multiple hidden aria-hidden="true" tabIndex={-1} />
        <button className="muster-primary" type="submit" aria-busy={isPreparing} disabled={isPreparing}>
          {isPreparing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Post
        </button>
      </div>
    </form>
  );
}
