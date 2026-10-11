"use client";

// 2026-10-11: everyone (children too) can put their own picture at the top of
// Home. It replaces the family photo for that person only; removing it brings
// the family photo back. Settings → "My picture on Home".
import { useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { compressImage } from "@/lib/imageCompress";
import { headerUrl, myHeaderUrl, removeMyHeader, uploadMyHeader, useFamilyMedia } from "@/lib/familyMedia";

export default function MyHomePicture() {
  const { m, err } = useI18n();
  const t = m.homePrefs;
  const media = useFamilyMedia();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true); setError(null);
    try {
      const dataUrl = await compressImage(file, { mode: "fit", maxW: 1400, maxH: 1000, quality: 0.78 });
      await uploadMyHeader(dataUrl);
    } catch (e2) {
      setError(e2 instanceof Error ? err(e2.message) : m.components.avatar.uploadFailed);
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    setBusy(true);
    try { await removeMyHeader(); } finally { setBusy(false); }
  }

  const src = media.myHeader ? myHeaderUrl(media.myHeader) : media.header ? headerUrl(media.header) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45 }}>
        {media.header ? t.myPictureHint : t.myPictureHintNoFamily}
      </div>
      <div style={{ borderRadius: 14, overflow: "hidden", border: "1.5px solid var(--border)", position: "relative", opacity: busy ? 0.55 : 1 }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ height: 96, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", color: "var(--subtle)", fontSize: 13 }}>
            {t.myPictureNone}
          </div>
        )}
        {!media.myHeader && media.header && (
          <span style={{ position: "absolute", left: 10, bottom: 10, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: "3px 9px" }}>
            {t.myPictureFamily}
          </span>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        {media.myHeader && (
          <button onClick={onRemove} disabled={busy} style={{ minHeight: 40, background: "none", border: "1.5px solid var(--border)", borderRadius: 50, padding: "0 14px", color: "var(--fg-2)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {t.removePicture}
          </button>
        )}
        <button onClick={() => { setError(null); input.current?.click(); }} disabled={busy} style={{ minHeight: 40, background: "var(--ink)", color: "#fff", border: "none", borderRadius: 50, padding: "0 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          {busy ? t.uploading : media.myHeader ? t.changePicture : t.choosePicture}
        </button>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} style={{ display: "none" }} />
      </div>
      {error && <div style={{ fontSize: 12.5, color: "var(--danger)" }}>{error}</div>}
    </div>
  );
}
