
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IcBack() { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><polyline points="15 18 9 12 15 6"/></svg>; }

type Member = { id: string; name: string; role: string; memberId?: string };
type BookingCategory = "CHORE" | "TRAINING";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NUMS = [1, 2, 3, 4, 5, 6, 0]; // JS getDay: 0=Sun, mapped to index

const CHORE_TEMPLATES = [
  "Clean your room", "Empty the dishwasher", "Take out the trash",
  "Set the table", "Pack your gym bag", "Do your homework",
  "Feed the pet", "Make your bed", "Tidy your desk",
];

// 2026-07-28: trainings/practices as a recurring booking assigned to a
// child — Mikael's request was "like a normal booking, Karate, then set it
// on a day, recurring". Reuses this exact form (assign to child + how
// often + start date) since that's already 90% of what a training booking
// needs; only difference is no completion/approval step. See PRODUCT_SPEC 4b.19.
// Broadened 2026-08-02 (Mikael: "training kanske e fel, activity är bättre
// ... scouter, teater eller liknande") — first six shown (.slice(0,6) below)
// deliberately mix sport and non-sport so the suggestions themselves signal
// this isn't just a sports-practice tracker.
const TRAINING_TEMPLATES = [
  "Karate", "Scouts", "Dance class", "Football practice", "Theater/Drama", "Piano lesson",
  "Swimming", "Choir", "Gymnastics", "Chess club", "Ice hockey", "Riding lesson",
];

function NewBookingContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Locked for the lifetime of this form — set once from the entry point
  // (URL `?type=`), never toggled by the user. See the 2026-08-18 note below.
  const [category] = useState<BookingCategory>(
    searchParams.get("type") === "training" ? "TRAINING" : "CHORE"
  );

  const [name, setName] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [recurrence, setRecurrence] = useState<"DAILY" | "WEEKLY" | "DAYS">("WEEKLY");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon–Fri
  // 2026-07-28: prefilled when arriving from the Calendar's "+" button
  // (type first, then date, then details).
  const [startDate, setStartDate] = useState(searchParams.get("date") ?? new Date().toISOString().split("T")[0]);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [note, setNote] = useState("");
  // 2026-08-18: assignable to ANY household member, not just children — see
  // Mikael's feedback ("chores kan utföras av en familjemedlem, inte bara
  // barn"). Was `childMembers`/`children`; now `householdMembers`/`members`.
  const [members, setMembers] = useState<Member[]>([]);
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
        const householdMembers: Member[] = data.householdMembers ?? [];
        setMembers(householdMembers);
        setTrialChildId(data.trialChildId);
        // Pre-select the trial child, else the first member
        if (data.trialChildId) setAssignedTo(data.trialChildId);
        else if (householdMembers.length > 0) setAssignedTo(householdMembers[0].id);
      }
    } catch (e) { console.error(e); }
  }

  function toggleDay(dayNum: number) {
    setSelectedDays(prev =>
      prev.includes(dayNum) ? prev.filter(d => d !== dayNum) : [...prev, dayNum]
    );
  }

  const isTraining = category === "TRAINING";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError(isTraining ? "Name is required" : "Chore name is required"); return; }
    if (!assignedTo) { setError("Assign to someone"); return; }
    if (recurrence === "DAYS" && selectedDays.length === 0) { setError("Select at least one day"); return; }

    setSaving(true);
    setError("");

    const body: Record<string, unknown> = {
      name: name.trim(),
      category,
      assignedTo,
      recurrence: recurrence === "DAYS" ? "WEEKLY" : recurrence,
      recurrenceDays: recurrence === "DAYS" ? selectedDays.sort().join(",") : null,
      startDate: new Date(startDate).toISOString(),
      requiresApproval: isTraining ? false : requiresApproval,
      note: note.trim() || null,
    };

    try {
      const res = await fetch("/api/family/chores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        // Training now has its own section (2026-07-28) — land there instead
        // of the Chores/Family page so the new booking is immediately visible.
        router.push(isTraining ? "/dashboard/training" : "/dashboard/family");
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
    background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 12,
    padding: "12px 14px", fontSize: 15, color: "var(--fg)", fontFamily: FONT,
    outline: "none",
  };

  const label: React.CSSProperties = {
    fontSize: 13, fontWeight: 700, color: "var(--fg-2)", marginBottom: 6, display: "block",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT }}>
      {/* Header */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-2)", display: "flex", padding: 4 }}>
            <IcBack />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "var(--fg)", margin: 0 }}>{isTraining ? "New activity" : "New chore"}</h1>
        </div>
      </div>

      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "24px 20px 60px" }}>
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* 2026-08-18: Chore and Activity are now fully separate flows —
              each entry point (Chores tab vs. Activities tab, or the
              Calendar's "+" wizard) locks `category` via the URL and this
              form never lets you switch between them, so an "Activity" can
              no longer show up while creating a chore (see Mikael's
              feedback). A small label instead of the old toggle just
              confirms which one you're creating. */}
          <div style={{
            display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: 8,
            background: "var(--surface-3)", borderRadius: 999, padding: "6px 14px",
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-2)" }}>
              {isTraining ? "🎯 New activity" : "🧹 New chore"}
            </span>
          </div>

          {/* Name */}
          <div>
            <label style={label}>{isTraining ? "What is it?" : "Chore name"}</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder={isTraining ? "e.g. Karate, Scouts, Theater…" : "e.g. Clean your room"}
              style={inp} autoFocus />
            {/* Suggestions */}
            {!name && (
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 7 }}>
                {(isTraining ? TRAINING_TEMPLATES : CHORE_TEMPLATES).slice(0, 6).map(t => (
                  <button key={t} type="button" onClick={() => setName(t)}
                    style={{ background: "var(--surface-3)", border: "none", borderRadius: 50, padding: "7px 14px", fontSize: 12, fontWeight: 600, color: "var(--fg-2)", cursor: "pointer", fontFamily: FONT }}>
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Assigned to */}
          <div>
            <label style={label}>Assigned to</label>
            {members.length === 0 ? (
              <div style={{ background: "var(--tint-warning)", borderRadius: 12, padding: 14, fontSize: 13, color: "var(--warning)" }}>
                No family members yet. Add someone in Family first.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {members.map(c => {
                  const isTrialLocked = trialChildId !== null && c.id !== trialChildId;
                  return (
                    <button key={c.id} type="button"
                      disabled={isTrialLocked}
                      onClick={() => !isTrialLocked && setAssignedTo(c.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                        background: assignedTo === c.id ? "var(--tint-accent)" : isTrialLocked ? "var(--surface-2)" : "var(--surface)",
                        border: assignedTo === c.id ? "2px solid var(--accent)" : "1.5px solid var(--border)",
                        borderRadius: 12, cursor: isTrialLocked ? "not-allowed" : "pointer",
                        opacity: isTrialLocked ? 0.5 : 1, fontFamily: FONT, textAlign: "left",
                      }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--ink)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>{c.name}</span>
                      {isTrialLocked && <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--subtle)" }}>Pro only</span>}
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
                    background: recurrence === val ? "var(--ink)" : "var(--surface)",
                    color: recurrence === val ? "#fff" : "var(--fg-2)",
                    border: recurrence === val ? "none" : "1.5px solid var(--border)",
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
                        background: active ? "var(--accent-bg)" : "var(--surface)",
                        color: active ? "#fff" : "var(--fg-2)",
                        border: active ? "none" : "1.5px solid var(--border)",
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

          {/* Requires approval toggle — a CHORE-only concept, no one "approves" a training booking */}
          {!isTraining && (
            <div style={{ background: "var(--surface)", borderRadius: 14, border: "1.5px solid var(--border)", padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)" }}>Requires adult approval</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                    Child marks done → you approve it
                  </div>
                </div>
                <button type="button" onClick={() => setRequiresApproval(p => !p)}
                  style={{
                    width: 48, height: 28, borderRadius: 50, border: "none", cursor: "pointer",
                    background: requiresApproval ? "var(--accent-bg)" : "var(--border)",
                    transition: "background 0.2s", position: "relative", flexShrink: 0,
                  }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", background: "var(--surface)",
                    position: "absolute", top: 3,
                    left: requiresApproval ? 23 : 3,
                    transition: "left 0.2s",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                  }} />
                </button>
              </div>
            </div>
          )}

          {/* Notes (optional) */}
          <div>
            <label style={label}>Notes <span style={{ fontWeight: 400, color: "var(--subtle)" }}>(optional)</span></label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder={isTraining ? "e.g. location, leader, what to bring…" : "Any extra instructions for the child…"}
              rows={3}
              style={{ ...inp, resize: "none" as const }} />
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: "var(--tint-danger)", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "var(--danger)", fontWeight: 600 }}>
              {error}
            </div>
          )}

          {/* Save */}
          <button type="submit" disabled={saving || !name.trim() || !assignedTo}
            style={{
              background: "var(--ink)", color: "#fff", border: "none", borderRadius: 50,
              padding: "15px", fontSize: 15, fontWeight: 700, cursor: "pointer",
              fontFamily: FONT, opacity: saving || !name.trim() || !assignedTo ? 0.6 : 1,
            }}>
            {saving ? "Saving…" : isTraining ? "Save activity" : "Save chore"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function NewBookingPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{ color: "var(--muted)" }}>Loading…</div>
      </div>
    }>
      <NewBookingContent />
    </Suspense>
  );
}
