"use client";

// 2026-09-28 (row 40): a person's round avatar — their photo if one is
// uploaded, otherwise a coloured initial (colour stable per person).
import { useState } from "react";
import { avatarUrl, useFamilyMedia } from "@/lib/familyMedia";

const PALETTE = ["#C24F26", "#C4367A", "#1E7D52", "#D85A30", "#6A44CC", "#0E9F8E", "#B45309", "#3730A3"];

function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export default function Avatar({ userId, name, size = 36, ring = false }: { userId: string; name: string | null | undefined; size?: number; ring?: boolean }) {
  const media = useFamilyMedia();
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
        background: showImg ? "var(--surface-3)" : colorFor(userId), color: "#fff",
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
