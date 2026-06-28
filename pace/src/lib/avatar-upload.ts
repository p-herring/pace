const AVATAR_BUCKET = "avatars";
const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const TARGET_SIZE = 512;
const OUTPUT_TYPE = "image/webp";
const OUTPUT_QUALITY = 0.86;

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type PreparedAvatar = {
  file: File;
  previewUrl: string;
};

export function validateAvatarFile(file: File): string | null {
  if (!ACCEPTED_TYPES.has(file.type)) {
    return "Choose a JPG, PNG or WebP image.";
  }

  if (file.size > MAX_INPUT_BYTES) {
    return "Choose an image under 5MB.";
  }

  return null;
}

export async function prepareAvatarFile(file: File): Promise<PreparedAvatar> {
  const validationError = validateAvatarFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

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
    throw new Error("This browser could not prepare that image.");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("This browser could not compress that image."))),
      OUTPUT_TYPE,
      OUTPUT_QUALITY,
    );
  });

  const preparedFile = new File([blob], "avatar.webp", { type: OUTPUT_TYPE });

  return {
    file: preparedFile,
    previewUrl: URL.createObjectURL(preparedFile),
  };
}

export function avatarStoragePath(userId: string): string {
  return `${userId}/${crypto.randomUUID()}.webp`;
}

export function avatarPathFromPublicUrl(publicUrl: string | null | undefined): string | null {
  if (!publicUrl) return null;

  const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
  const markerIndex = publicUrl.indexOf(marker);
  if (markerIndex === -1) return null;

  return decodeURIComponent(publicUrl.slice(markerIndex + marker.length));
}

export function setFileInputFile(input: HTMLInputElement, file: File): void {
  setFileInputFiles(input, [file]);
}

export function setFileInputFiles(input: HTMLInputElement, files: File[]): void {
  const transfer = new DataTransfer();
  for (const file of files) {
    transfer.items.add(file);
  }
  input.files = transfer.files;
}

export { AVATAR_BUCKET };
