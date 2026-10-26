import { ALLOWED_PROOF_TYPES, MAX_PROOF_BYTES } from "./schema";

export const MAX_IMAGE_SIDE = 1600;
export const JPEG_QUALITY = 0.8;

export function fittedImageSize(
  width: number,
  height: number,
  maxSide = MAX_IMAGE_SIDE,
): {
  width: number;
  height: number;
} {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("Image dimensions must be positive numbers");
  }
  if (!Number.isFinite(maxSide) || maxSide <= 0)
    throw new Error("Maximum image side must be positive");
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This image could not be prepared. Choose another photo."));
    };
    image.src = url;
  });
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("This image could not be prepared. Choose another photo."));
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

export async function prepareProof(
  file: File,
): Promise<{ blob: Blob; contentType: string; extension: string }> {
  if (!ALLOWED_PROOF_TYPES.some((type) => type === file.type)) {
    throw new Error("Choose a JPEG, PNG, WebP photo or PDF");
  }
  if (file.size > MAX_PROOF_BYTES) {
    throw new Error("That file is too large. Choose a photo or PDF under 5 MB.");
  }
  if (file.type === "application/pdf") {
    return { blob: file, contentType: file.type, extension: "pdf" };
  }
  const image = await loadImage(file);
  const size = fittedImageSize(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This image could not be prepared. Choose another photo.");
  context.drawImage(image, 0, 0, size.width, size.height);
  return { blob: await canvasBlob(canvas), contentType: "image/jpeg", extension: "jpg" };
}
