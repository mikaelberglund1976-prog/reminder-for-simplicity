// 2026-10-09: web push without an extra npm dependency (persona review:
// "children don't read email — nothing pings in the phone").
//
//  - VAPID (RFC 8292): ES256 JWT signed with Node's crypto.
//  - Payload encryption (RFC 8291, aes128gcm) with ECDH + HKDF from Node's
//    crypto, so every push carries its own title/body/url and the service
//    worker can show it without a second request.
//  - Subscriptions live in a self-creating table (same pattern as
//    reminder_times, OPERATIONS.md §5a) — no manual database step.
//  - On iPhone, push works only when the app is installed on the home screen
//    (iOS 16.4+). The settings card explains that.
//
// Env (Vercel): VAPID_PUBLIC_KEY (base64url, 65-byte uncompressed P-256 point),
// VAPID_PRIVATE_KEY (base64url, 32 bytes), VAPID_SUBJECT (mailto:…).
import { createECDH, createPrivateKey, createCipheriv, hkdfSync, randomBytes, sign } from "crypto";
import { prisma } from "@/lib/prisma";

export type PushMessage = { title: string; body: string; url?: string; tag?: string };
export type PushKind = "reminders" | "tomorrow";
export const PUSH_KINDS: PushKind[] = ["reminders", "tomorrow"];

const b64u = (b: Buffer) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64u = (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

export function vapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}
export function pushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function vapidAuthHeader(endpoint: string): string {
  const pub = process.env.VAPID_PUBLIC_KEY!;
  const pubBytes = fromB64u(pub);
  const key = createPrivateKey({
    key: { kty: "EC", crv: "P-256", d: process.env.VAPID_PRIVATE_KEY!, x: b64u(pubBytes.subarray(1, 33)), y: b64u(pubBytes.subarray(33, 65)) },
    format: "jwk",
  });
  const header = b64u(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64u(Buffer.from(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: process.env.VAPID_SUBJECT || "mailto:mikaelberglund1976@gmail.com",
  })));
  const signature = sign("sha256", Buffer.from(`${header}.${claims}`), { key, dsaEncoding: "ieee-p1363" });
  return `vapid t=${header}.${claims}.${b64u(signature)}, k=${pub}`;
}

/** RFC 8291 aes128gcm encryption of one record. Exported for the self-test. */
export function encryptPayload(payload: Buffer, p256dh: string, auth: string): Buffer {
  const uaPublic = fromB64u(p256dh);
  const authSecret = fromB64u(auth);
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const shared = ecdh.computeSecret(uaPublic);
  const salt = randomBytes(16);
  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic]);
  const ikm = Buffer.from(hkdfSync("sha256", shared, authSecret, keyInfo, 32));
  const cek = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));
  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  const body = Buffer.concat([cipher.update(Buffer.concat([payload, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);
  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(4096, 16);
  header.writeUInt8(asPublic.length, 20);
  return Buffer.concat([header, asPublic, body]);
}

// ── storage ──────────────────────────────────────────────────────────────────
let ensured: Promise<void> | null = null;
export function ensurePushTables(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "push_subscriptions" ("endpoint" TEXT NOT NULL, "userId" TEXT NOT NULL, "p256dh" TEXT NOT NULL, "auth" TEXT NOT NULL, "userAgent" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("endpoint"))`
      );
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "push_subscriptions_userId_idx" ON "push_subscriptions" ("userId")`);
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "push_prefs" ("userId" TEXT NOT NULL, "kinds" TEXT NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "push_prefs_pkey" PRIMARY KEY ("userId"))`
      );
    })().catch((err) => { ensured = null; throw err; });
  }
  return ensured;
}

export async function saveSubscription(userId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }, userAgent: string | null) {
  await ensurePushTables();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "push_subscriptions" ("endpoint", "userId", "p256dh", "auth", "userAgent") VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT ("endpoint") DO UPDATE SET "userId" = EXCLUDED."userId", "p256dh" = EXCLUDED."p256dh", "auth" = EXCLUDED."auth", "userAgent" = EXCLUDED."userAgent"`,
    sub.endpoint, userId, sub.keys.p256dh, sub.keys.auth, userAgent
  );
}

export async function removeSubscription(userId: string, endpoint: string) {
  await ensurePushTables();
  await prisma.$executeRawUnsafe(`DELETE FROM "push_subscriptions" WHERE "endpoint" = $1 AND "userId" = $2`, endpoint, userId);
}

export async function subscriptionCount(userId: string): Promise<number> {
  await ensurePushTables();
  const rows = await prisma.$queryRawUnsafe<{ n: bigint }[]>(`SELECT COUNT(*)::bigint AS n FROM "push_subscriptions" WHERE "userId" = $1`, userId);
  return Number(rows[0]?.n ?? 0);
}

export async function getPushKinds(userId: string): Promise<PushKind[]> {
  await ensurePushTables();
  const rows = await prisma.$queryRawUnsafe<{ kinds: string }[]>(`SELECT "kinds" FROM "push_prefs" WHERE "userId" = $1`, userId);
  if (!rows[0]) return [...PUSH_KINDS]; // default: everything on
  return rows[0].kinds.split(",").filter((k): k is PushKind => (PUSH_KINDS as string[]).includes(k));
}

export async function setPushKinds(userId: string, kinds: PushKind[]) {
  await ensurePushTables();
  const clean = PUSH_KINDS.filter((k) => kinds.includes(k)).join(",");
  await prisma.$executeRawUnsafe(
    `INSERT INTO "push_prefs" ("userId", "kinds", "updatedAt") VALUES ($1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT ("userId") DO UPDATE SET "kinds" = EXCLUDED."kinds", "updatedAt" = CURRENT_TIMESTAMP`,
    userId, clean
  );
}

// ── sending ──────────────────────────────────────────────────────────────────
/** Sends to every device of `userId` that opted into `kind` (null = always, e.g. a test). Returns devices reached. */
export async function sendPushToUser(userId: string, msg: PushMessage, kind: PushKind | null = null): Promise<number> {
  if (!pushConfigured()) return 0;
  try {
    await ensurePushTables();
    if (kind && !(await getPushKinds(userId)).includes(kind)) return 0;
    const subs = await prisma.$queryRawUnsafe<{ endpoint: string; p256dh: string; auth: string }[]>(
      `SELECT "endpoint", "p256dh", "auth" FROM "push_subscriptions" WHERE "userId" = $1`, userId
    );
    let reached = 0;
    const payload = Buffer.from(JSON.stringify({ title: msg.title, body: msg.body, url: msg.url ?? "/dashboard", tag: msg.tag }));
    for (const s of subs) {
      try {
        const res = await fetch(s.endpoint, {
          method: "POST",
          headers: {
            Authorization: vapidAuthHeader(s.endpoint),
            TTL: "43200",
            Urgency: "normal",
            "Content-Encoding": "aes128gcm",
            "Content-Type": "application/octet-stream",
          },
          body: new Uint8Array(encryptPayload(payload, s.p256dh, s.auth)),
        });
        if (res.status === 404 || res.status === 410) {
          await prisma.$executeRawUnsafe(`DELETE FROM "push_subscriptions" WHERE "endpoint" = $1`, s.endpoint);
        } else if (res.ok) {
          reached++;
        } else {
          console.error("Push failed", res.status, await res.text().catch(() => ""));
        }
      } catch (err) {
        console.error("Push send error:", err);
      }
    }
    return reached;
  } catch (err) {
    // Push is best-effort: it must never break the cron run or an API call.
    console.error("sendPushToUser failed:", err);
    return 0;
  }
}
