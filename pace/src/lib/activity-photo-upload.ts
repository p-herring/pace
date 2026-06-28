const ACTIVITY_PHOTOS_BUCKET = "activity-photos";
const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const MAX_PHOTOS = 6;
const TARGET_SIZE = 1280;
const OUTPUT_TYPE = "image/webp";
const OUTPUT_QUALITY = 0.84;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateActivityPhoto(file: File): string | null {
  if (!ACCEPTED_TYPES.has(file.type)) {
    return "Photos must be JPG, PNG or WebP.";
  }

  if (file.size > MAX_INPUT_BYTES) {
    return "Keep each photo under 5MB.";
  }

  return null;
}

export async function prepareActivityPhoto(file: File, index: number): Promise<File> {
  const validationError = validateActivityPhoto(file);
  if (validationError) throw new Error(validationError);

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, TARGET_SIZE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("This browser could not prepare one of those photos.");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("This browser could not compress one of those photos."))),
      OUTPUT_TYPE,
      OUTPUT_QUALITY,
    );
  });

  return new File([blob], `activity-${index + 1}.webp`, { type: OUTPUT_TYPE });
}

export function activityPhotoStoragePath(userId: string, postId: string): string {
  return `${userId}/${postId}/${crypto.randomUUID()}.webp`;
}

export { ACTIVITY_PHOTOS_BUCKET, MAX_PHOTOS };
