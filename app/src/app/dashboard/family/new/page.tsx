
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IcBack() { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><polyline points="15 18 9 12 15 6"/></svg>; }

type Member = { id: string; name: string; role: string };

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NUMS = [1, 2, 3, 4, 5, 6, 0]; // JS getDay: 0=Sun, mapped to index

const CHORE_TEMPLATES = [
  "Clean your room", "Empty the dishwasher", "Take out the trash",
  "Set the table", "Pack your gym bag", "Do your homework",
  "Feed the pet", "Make your bed", "Tidy your desk",
];

export default function NewChorePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [name, setName] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [recurrence, setRecurrence] = useState<"DAILY" | "WEEKLY" | "DAYS">("WEEKLY");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon–Fri
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [note, setNote] = useState("");
  const [children, setChildren] = useState<Member[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [trialChildId, setTrialChildId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") fetchTrialInfo();
  }, [status]);

  async function fetchTrialInfo() {
    try {
      const res = await fetch("/api/family/trial");
      if (res.ok) {
        const data = await res.json();
        const childMembers: Member[] = data.childMembers ?? [];
        setChildren(childMembers);
        setTrialChildId(data.trialChildId);
        // Pre-select the trial child or first child
        if (data.trialChildId) setAssignedTo(data.trialChildId);
        else if (childMembers.length > 0) setAssignedTo(childMembers[0].id);
      }
    } catch (e) { console.error(e); }
  }

  function toggleDay(dayNum: number) {
    setSelectedDays(prev =>
      prev.includes(dayNum) ? prev.filter(d => d !== dayNum) : [...prev, dayNum]
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Chore name is required"); return; }
    if (!assignedTo) { setError("Assign to a child"); return; }
    if (recurrence === "DAYS" && selectedDays.length === 0) { setError("Select at least one day"); return; }

    setSaving(true);
    setError("");

    const body: Record<string, unknown> = {
      name: name.trim(),
      assignedTo,
      recurrence: recurrence === "DAYS" ? "WEEKLY" : recurrence,
      recurrenceDays: recurrence === "DAYS" ? selectedDays.sort().join(",") : null,
      startDate: new Date(startDate).toISOString(),
      requiresApproval,
      note: note.trim() || null,
    };

    try {
      const res = await fetch("/api/family/chores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        router.push("/dashboard/family");
      } else {
        const d = await res.json();
        setError(d.error ?? "Something went wrong");
      }
    } catch (e) {
      console.error(e);
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  const inp: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: "#fff", border: "1.5px solid #E8EDF4", borderRadius: 12,
    padding: "12px 14px", fontSize: 15, color: "#0F172A", fontFamily: FONT,
    outline: "none",
  };

  const label: React.CSSProperties = {
    fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6, display: "block",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F5F6FA", fontFamily: FONT }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E8EDF4", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "#4B5563", display: "flex", padding: 4 }}>
            <IcBack />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", margin: 0 }}>New chore</h1>
        </div>
      </div>

      <main style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px 60px" }}>
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Chore name */}
          <div>
            <label style={label}>Chore name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Clean your room"
              style={inp} autoFocus />
            {/* Suggestions */}
            {!name && (
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 7 }}>
                {CHORE_TEMPLATES.slice(0, 6).map(t => (
                  <button key={t} type="button" onClick={() => setName(t)}
                    style={{ background: "#F0F3FA", border: "none", borderRadius: 50, padding: "7px 14px", fontSize: 12, fontWeight: 600, color: "#4B5563", cursor: "pointer", fontFamily: FONT }}>
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Assigned to */}
          <div>
            <label style={label}>Assigned to</label>
            {children.length === 0 ? (
              <div style={{ background: "#FFF3CC", borderRadius: 12, padding: 14, fontSize: 13, color: "#92400E" }}>
                No children in household. Add a child member first.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {children.map(c => {
                  const isTrialLocked = trialChildId !== null && c.id !== trialChildId;
                  return (
                    <button key={c.id} type="button"
                      disabled={isTrialLocked}
                      onClick={() => !isTrialLocked && setAssignedTo(c.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                        background: assignedTo === c.id ? "#EBF3FF" : isTrialLocked ? "#F8FAFD" : "#fff",
                        border: assignedTo === c.id ? "2px solid #5B9CF5" : "1.5px solid #E8EDF4",
                        borderRadius: 12, cursor: isTrialLocked ? "not-allowed" : "pointer",
                        opacity: isTrialLocked ? 0.5 : 1, fontFamily: FONT, textAlign: "left",
                      }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1A2340", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{c.name}</span>
                      {isTrialLocked && <span style={{ marginLeft: "auto", fontSize: 11, color: "#9CA3AF" }}>Pro only</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Frequency */}
          <div>
            <label style={label}>How often?</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              {([["DAILY", "Every day"], ["WEEKLY", "Once a week"], ["DAYS", "Specific days"]] as const).map(([val, lbl]) => (
                <button key={val} type="button" onClick={() => setRecurrence(val)}
                  style={{
                    padding: "10px 8px", borderRadius: 12, fontSize: 12, fontWeight: 700,
                    background: recurrence === val ? "#1A2340" : "#fff",
                    color: recurrence === val ? "#fff" : "#4B5563",
                    border: recurrence === val ? "none" : "1.5px solid #E8EDF4",
                    cursor: "pointer", fontFamily: FONT,
                  }}>
                  {lbl}
                </button>
              ))}
            </div>

            {/* Day picker for DAYS mode */}
            {recurrence === "DAYS" && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {DAYS.map((d, i) => {
                  const num = DAY_NUMS[i];
                  const active = selectedDays.includes(num);
                  return (
                    <button key={d} type="button" onClick={() => toggleDay(num)}
                      style={{
                        width: 42, height: 42, borderRadius: "50%", fontSize: 12, fontWeight: 700,
                        background: active ? "#5B9CF5" : "#fff",
                        color: active ? "#fff" : "#4B5563",
                        border: active ? "none" : "1.5px solid #E8EDF4",
                        cursor: "pointer", fontFamily: FONT,
                      }}>
                      {d}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Start date */}
          <div>
            <label style={label}>Start date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={inp} />
          </div>

          {/* Requires approval toggle */}
          <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #E8EDF4", padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>Requires adult approval</div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 3 }}>
                  Child marks done → you approve it
                </div>
              </div>
              <button type="button" onClick={() => setRequiresApproval(p => !p)}
                style={{
                  width: 48, height: 28, borderRadius: 50, border: "none", cursor: "pointer",
                  background: requiresApproval ? "#5B9CF5" : "#D1D5DB",
                  transition: "background 0.2s", position: "relative", flexShrink: 0,
                }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", background: "#fff",
                  position: "absolute", top: 3,
                  left: requiresApproval ? 23 : 3,
                  transition: "left 0.2s",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                }} />
              </button>
            </div>
          </div>

          {/* Notes (optional) */}
          <div>
            <label style={label}>Notes <span style={{ fontWeight: 400, color: "#9CA3AF" }}>(optional)</span></label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Any extra instructions for the child…"
              rows={3}
              style={{ ...inp, resize: "none" as const }} />
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: "#FFE8E8", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#C44444", fontWeight: 600 }}>
              {error}
            </div>
          )}

          {/* Save */}
          <button type="submit" disabled={saving || !name.trim() || !assignedTo}
            style={{
              background: "#1A2340", color: "#fff", border: "none", borderRadius: 50,
              padding: "15px", fontSize: 15, fontWeight: 700, cursor: "pointer",
              fontFamily: FONT, opacity: saving || !name.trim() || !assignedTo ? 0.6 : 1,
            }}>
            {saving ? "Saving…" : "Save chore"}
          </button>
        </form>
      </main>
    </div>
  );
}
