"use client";

// 2026-09-28 (row 40): a person's round avatar — their photo if one is
// uploaded, otherwise a coloured initial (colour stable per person).
import { useState } from "react";
import { avatarUrl, useFamilyMedia } from "@/lib/familyMedia";
// 2026-10-10: the colour is the family's own choice (Settings → Colours, Pro)
// when set, otherwise the stable built-in one as before.
import { personColor } from "@/lib/familyColors";
import { useFamilyColors } from "@/lib/familyColorsClient";

export default function Avatar({ userId, name, size = 36, ring = false }: { userId: string; name: string | null | undefined; size?: number; ring?: boolean }) {
  const media = useFamilyMedia();
  const { colors } = useFamilyColors();
  const version = media.avatars[userId];
  const [broken, setBroken] = useState<number | null>(null);
  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
  const showImg = !!version && broken !== version;
  return (
    <span
      aria-hidden
      style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0, overflow: "hidden",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: showImg ? "var(--surface-3)" : personColor(colors, userId), color: "#fff",
        fontWeight: 800, fontSize: Math.round(size * 0.42), lineHeight: 1,
        boxShadow: ring ? "0 0 0 2px var(--surface)" : undefined,
      }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl(userId, version)} alt="" width={size} height={size} onError={() => setBroken(version)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : initial}
    </span>
  );
}
