"use client";

// 2026-09-28 (row 40): shrink photos in the browser before upload, so a
// 5 MB phone photo becomes a ~20 KB avatar or a ~100 KB header. Uses
// createImageBitmap with EXIF orientation where available.

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    } catch { /* fall back to <img> (e.g. HEIC on some browsers) */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/**
 * mode "square": centre-crop to a size×size square (avatars).
 * mode "fit": keep the aspect ratio, longest sides capped at maxW×maxH (headers).
 */
export async function compressImage(
  file: File,
  opts: { mode: "square"; size: number; quality?: number } | { mode: "fit"; maxW: number; maxH: number; quality?: number },
): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Pick a picture file");
  const src = await decode(file);
  const sw = "naturalWidth" in src ? src.naturalWidth : src.width;
  const sh = "naturalHeight" in src ? src.naturalHeight : src.height;
  if (!sw || !sh) throw new Error("Couldn't read that picture");

  let sx = 0, sy = 0, cw = sw, ch = sh, dw: number, dh: number;
  if (opts.mode === "square") {
    const side = Math.min(sw, sh);
    sx = (sw - side) / 2; sy = (sh - side) / 2; cw = side; ch = side;
    dw = dh = Math.min(opts.size, side);
  } else {
    const scale = Math.min(1, opts.maxW / sw, opts.maxH / sh);
    dw = Math.round(sw * scale); dh = Math.round(sh * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = dw; canvas.height = dh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't process the picture");
  ctx.fillStyle = "#fff"; // transparent PNGs → white, not black, as JPEG
  ctx.fillRect(0, 0, dw, dh);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src as CanvasImageSource, sx, sy, cw, ch, 0, 0, dw, dh);
  if ("close" in src && typeof src.close === "function") src.close();

  let q = opts.quality ?? 0.82;
  let out = canvas.toDataURL("image/jpeg", q);
  // Keep well under the server limits even for very detailed photos.
  const limit = opts.mode === "square" ? 250_000 : 800_000;
  while (out.length * 0.75 > limit && q > 0.4) {
    q -= 0.1;
    out = canvas.toDataURL("image/jpeg", q);
  }
  return out;
}
