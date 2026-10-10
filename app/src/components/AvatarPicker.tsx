"use client";

// 2026-10-01 (phone test): a person's own photo, tappable to change it.
// Same picture as everywhere else in the app (it's the shared <Avatar>), so
// a person looks the same whoever is logged in. Anyone can change their own
// photo — a child too; a parent can also set it from Family members.
import { useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import { compressImage } from "@/lib/imageCompress";
import { removeAvatar, uploadAvatar, useFamilyMedia } from "@/lib/familyMedia";
import { useI18n } from "@/lib/i18n/client";

const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export default function AvatarPicker({ userId, name, size = 56, showRemove = false }: { userId: string; name: string | null | undefined; size?: number; showRemove?: boolean }) {
  const media = useFamilyMedia();
  const { m, err } = useI18n();
  const t = m.components.avatar;
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasPhoto = !!media.avatars[userId];
  const badge = Math.max(20, Math.round(size * 0.4));

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true); setError(null);
    try {
      const dataUrl = await compressImage(file, { mode: "square", size: 320 });
      await uploadAvatar(userId, dataUrl);
    } catch (e2) { setError(e2 instanceof Error ? err(e2.message) : t.uploadFailed); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
      <input ref={input} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
      <button type="button" onClick={() => input.current?.click()} disabled={busy} aria-label={hasPhoto ? t.change : t.add}
        style={{ position: "relative", background: "none", border: "none", padding: 0, cursor: "pointer", opacity: busy ? 0.5 : 1, borderRadius: "50%" }}>
        <Avatar userId={userId} name={name} size={size} />
        <span style={{
          position: "absolute", right: -2, bottom: -2, width: badge, height: badge, borderRadius: "50%",
          background: "var(--accent-bg)", color: "var(--on-accent)", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 0 2px var(--surface)",
        }}>
          <svg width={Math.round(badge * 0.6)} height={Math.round(badge * 0.6)} viewBox="0 0 24 24" {...STR}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        </span>
      </button>
      {showRemove && hasPhoto && !busy && (
        <button type="button" onClick={() => removeAvatar(userId)} style={{ background: "none", border: "none", padding: 0, color: "var(--subtle)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
          {t.remove}
        </button>
      )}
      {error && <span style={{ fontSize: 11, color: "var(--danger)", maxWidth: 120, textAlign: "center" }}>{error}</span>}
    </div>
  );
}
