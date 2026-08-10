const HEIC_PATTERN = /\.(heic|heif)$/i;
const MAX_DIMENSION = 2000;

function isHeic(file: File): boolean {
  return HEIC_PATTERN.test(file.name) || file.type === "image/heic" || file.type === "image/heif";
}

async function loadBitmap(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob);
}

function canvasToBlob(canvas: HTMLCanvasElement | OffscreenCanvas, type: string, quality: number): Promise<Blob | null> {
  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type, quality });
  }
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Decodes HEIC/HEIF if needed, downscales, and re-encodes as WebP (falls back to JPEG) in the browser. */
export async function compressImage(file: File): Promise<{ blob: Blob; name: string }> {
  let source: Blob = file;
  if (isHeic(file)) {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    source = Array.isArray(converted) ? converted[0] : converted;
  }

  const bitmap = await loadBitmap(source);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = typeof OffscreenCanvas !== "undefined"
    ? new OffscreenCanvas(width, height)
    : Object.assign(document.createElement("canvas"), { width, height });
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  ctx.drawImage(bitmap, 0, 0, width, height);

  const baseName = file.name.replace(/\.[^.]+$/, "");
  let blob = await canvasToBlob(canvas, "image/webp", 0.8);
  if (blob) return { blob, name: `${baseName}.webp` };

  blob = await canvasToBlob(canvas, "image/jpeg", 0.85);
  if (blob) return { blob, name: `${baseName}.jpg` };

  return { blob: source, name: file.name };
}
