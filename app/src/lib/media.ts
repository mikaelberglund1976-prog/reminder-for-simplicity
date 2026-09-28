// 2026-09-28 (test round, row 40): family photos — home-screen header image
// per household and a profile picture per person. See `model MediaImage`.
import { prisma } from "@/lib/prisma";

export type MediaKind = "avatar" | "header";

export const MAX_BYTES: Record<MediaKind, number> = {
  avatar: 300 * 1024,
  header: 900 * 1024,
};

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

// The table is additive and self-creating, so a deploy never needs a manual
// database step for this feature. Runs once per server instance.
let ensured: Promise<void> | null = null;
export function ensureMediaTable(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "media_images" ("id" TEXT NOT NULL, "kind" TEXT NOT NULL, "ownerId" TEXT NOT NULL, "mime" TEXT NOT NULL, "data" BYTEA NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "media_images_pkey" PRIMARY KEY ("id"))`
      );
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "media_images_kind_ownerId_key" ON "media_images"("kind", "ownerId")`
      );
    })().catch((err) => {
      ensured = null; // retry on the next request
      throw err;
    });
  }
  return ensured;
}

/** Parses a `data:image/...;base64,...` URL and validates type + size. */
export function parseDataUrl(dataUrl: unknown, kind: MediaKind): { mime: string; data: Buffer } | { error: string } {
  if (typeof dataUrl !== "string") return { error: "Image missing" };
  const m = /^data:(image\/[a-z+]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return { error: "Not an image" };
  const mime = m[1];
  if (!ALLOWED_MIME.has(mime)) return { error: "Use a JPEG, PNG or WebP picture" };
  const data = Buffer.from(m[2], "base64");
  if (data.length === 0) return { error: "Empty image" };
  if (data.length > MAX_BYTES[kind]) return { error: "Image is too large" };
  return { mime, data };
}

export async function saveImage(kind: MediaKind, ownerId: string, mime: string, data: Buffer) {
  await ensureMediaTable();
  // Prisma 5 types Bytes as Buffer, newer versions as Uint8Array — a Buffer
  // is both at runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bytes = data as any;
  return prisma.mediaImage.upsert({
    where: { kind_ownerId: { kind, ownerId } },
    create: { kind, ownerId, mime, data: bytes },
    update: { mime, data: bytes },
    select: { updatedAt: true },
  });
}

export async function deleteImage(kind: MediaKind, ownerId: string) {
  await ensureMediaTable();
  await prisma.mediaImage.deleteMany({ where: { kind, ownerId } });
}

export async function loadImage(kind: MediaKind, ownerId: string) {
  await ensureMediaTable();
  return prisma.mediaImage.findUnique({ where: { kind_ownerId: { kind, ownerId } } });
}

/** Versions (updatedAt, ms) for a household's header + its members' avatars — no image bytes. */
export async function mediaVersions(householdId: string | null, userIds: string[]) {
  await ensureMediaTable();
  const rows = await prisma.mediaImage.findMany({
    where: {
      OR: [
        ...(householdId ? [{ kind: "header", ownerId: householdId }] : []),
        ...(userIds.length ? [{ kind: "avatar", ownerId: { in: userIds } }] : []),
      ],
    },
    select: { kind: true, ownerId: true, updatedAt: true },
  });
  const avatars: Record<string, number> = {};
  let header: number | null = null;
  for (const r of rows) {
    if (r.kind === "header") header = r.updatedAt.getTime();
    else avatars[r.ownerId] = r.updatedAt.getTime();
  }
  return { header, avatars };
}

export function imageResponseHeaders(mime: string, length: number): HeadersInit {
  return {
    "Content-Type": mime,
    "Content-Length": String(length),
    // URLs carry ?v=<updatedAt>, so a cached copy never goes stale.
    "Cache-Control": "private, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  };
}
