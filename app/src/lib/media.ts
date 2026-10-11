// 2026-09-28 (test round, row 40): family photos — home-screen header image
// per household and a profile picture per person. See `model MediaImage`.
import { prisma } from "@/lib/prisma";

// 2026-10-11: "myheader" = a person's own Home picture (ownerId = userId).
// It replaces the family header for that person only; removing it brings the
// family header back.
export type MediaKind = "avatar" | "header" | "myheader";

export const MAX_BYTES: Record<MediaKind, number> = {
  avatar: 300 * 1024,
  header: 900 * 1024,
  myheader: 900 * 1024,
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
export async function mediaVersions(householdId: string | null, userIds: string[], viewerId?: string) {
  await ensureMediaTable();
  const rows = await prisma.mediaImage.findMany({
    where: {
      OR: [
        ...(householdId ? [{ kind: "header", ownerId: householdId }] : []),
        ...(userIds.length ? [{ kind: "avatar", ownerId: { in: userIds } }] : []),
        ...(viewerId ? [{ kind: "myheader", ownerId: viewerId }] : []),
      ],
    },
    select: { kind: true, ownerId: true, updatedAt: true },
  });
  const avatars: Record<string, number> = {};
  let header: number | null = null;
  let myHeader: number | null = null;
  for (const r of rows) {
    if (r.kind === "header") header = r.updatedAt.getTime();
    else if (r.kind === "myheader") myHeader = r.updatedAt.getTime();
    else avatars[r.ownerId] = r.updatedAt.getTime();
  }
  return { header, myHeader, avatars };
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

/**
 * 2026-09-29 (GDPR): photos must not outlive their owner. Removes avatars of
 * users that no longer exist and headers of households that are gone (a
 * household can be deleted from /admin, or cleaned up after an invite).
 * Called daily from lib/cron.ts; account purge also removes the avatar
 * directly.
 */
export async function purgeOrphanMedia(): Promise<number> {
  await ensureMediaTable();
  const a = await prisma.$executeRawUnsafe(
    `DELETE FROM "media_images" m WHERE m."kind" = 'avatar' AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u."id" = m."ownerId")`
  );
  const h = await prisma.$executeRawUnsafe(
    `DELETE FROM "media_images" m WHERE m."kind" = 'header' AND NOT EXISTS (SELECT 1 FROM "households" x WHERE x."id" = m."ownerId")`
  );
  const p = await prisma.$executeRawUnsafe(
    `DELETE FROM "media_images" m WHERE m."kind" = 'myheader' AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u."id" = m."ownerId")`
  );
  return a + h + p;
}
