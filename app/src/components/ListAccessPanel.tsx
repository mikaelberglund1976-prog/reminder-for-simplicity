"use client";

import { useState } from "react";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

export type ListMemberOption = { id: string; name: string; role: string };

// Shared "who can see this list" panel — used by both the shopping list and
// the wishlist pages (2026-07-27 multi-list change). Renaming is open to
// anyone who can open the panel; the visibleToAll toggle and member picker
// only render as editable when canEditAccess is true (OWNER/PARENT), since
// that's the one thing scoped to household admins.
export default function ListAccessPanel({
  listName,
  visibleToAll,
  memberIds,
  members,
  canEditAccess,
  onRename,
  onToggleVisibleToAll,
  onToggleMember,
}: {
  listName: string;
  visibleToAll: boolean;
  memberIds: string[];
  members: ListMemberOption[];
  canEditAccess: boolean;
  onRename: (name: string) => void;
  onToggleVisibleToAll: (value: boolean) => void;
  onToggleMember: (userId: string) => void;
}) {
  const [nameDraft, setNameDraft] = useState(listName);

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E4E3DE", padding: "14px", marginBottom: 18, fontFamily: FONT }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8 }}>
        List name
      </div>
      <input
        value={nameDraft}
        onChange={(e) => setNameDraft(e.target.value)}
        onBlur={() => { if (nameDraft.trim() && nameDraft.trim() !== listName) onRename(nameDraft.trim()); }}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        style={{ width: "100%", fontSize: 14, fontFamily: FONT, fontWeight: 600, color: "#0F172A", border: "1.5px solid #E4E3DE", borderRadius: 10, padding: "9px 12px", outline: "none", boxSizing: "border-box", marginBottom: 14 }}
      />

      <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8 }}>
        Who can see this list
      </div>

      {!canEditAccess ? (
        <div style={{ fontSize: 12.5, color: "#6B7280" }}>
          {visibleToAll ? "Everyone in the family." : "Only some family members — ask an owner or parent to change this."}
        </div>
      ) : (
        <>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#0F172A", cursor: "pointer", marginBottom: visibleToAll ? 0 : 10 }}>
            <input type="checkbox" checked={visibleToAll} onChange={(e) => onToggleVisibleToAll(e.target.checked)} style={{ width: 16, height: 16 }} />
            Everyone in the family
          </label>

          {!visibleToAll && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 2 }}>
              {members.map((m) => (
                <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#0F172A", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={memberIds.includes(m.id)}
                    onChange={() => onToggleMember(m.id)}
                    style={{ width: 16, height: 16 }}
                  />
                  {m.name}
                </label>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
