"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

type Child = { id: string; name: string; email: string };

const AVATAR_COLORS = [
  "#5B9CF5", "#E8614D", "#2A9D6F", "#C06010",
  "#8B5CF6", "#D97706", "#0891B2", "#BE185D",
];

function getColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function FamilySwitchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const householdId = searchParams.get("h");

  const [children, setChildren] = useState<Child[]>([]);
  const [householdName, setHouseholdName] = useState("Family");
  const [selected, setSelected] = useState<Child | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      if (!householdId) {
        router.push("/dashboard/family/child");
      }
    }
  }, [status, session, householdId, router]);

  useEffect(() => {
    if (!householdId) {
      setLoading(false);
      return;
    }
    fetch(`/api/family/children?h=${householdId}`)
      .then(r => r.json())
      .then(data => {
        setChildren(data.children ?? []);
        setHouseholdName(data.householdName ?? "Family");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [householdId]);

  function handleDigit(d: string) {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError("");
    if (next.length === 4) submitPin(next);
  }

  function handleBack() {
    setPin(p => p.slice(0, -1));
    setError("");
  }

  async function submitPin(p: string) {
    if (!selected) return;
    setSigning(true);
    setError("");
    try {
      const result = await signIn("credentials", {
        email: selected.email,
        password: p,
        redirect: false,
      });
      if (result?.ok) {
        router.push("/dashboard/family/child");
      } else {
        setError("Wrong PIN. Try again.");
        setPin("");
      }
    } catch {
      setError("Something went wrong.");
      setPin("");
    } finally {
      setSigning(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F5F6FA", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{ color: "#8B90A4" }}>Loading…</div>
      </div>
    );
  }

  if (!householdId) {
    return (
      <div style={{ minHeight: "100vh", background: "#F5F6FA", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 320 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👨‍👩‍👧</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", margin: "0 0 10px" }}>Family login</h1>
          <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>
            Ask a parent to share your family link so you can log in with your PIN.
          </p>
        </div>
      </div>
    );
  }

  // PIN entry screen
  if (selected) {
    const color = getColor(selected.name);
    const dots = [0, 1, 2, 3];

    return (
      <div style={{ minHeight: "100vh", background: "#F5F6FA", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: FONT, padding: 24 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, marginBottom: 12 }}>
          {selected.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", marginBottom: 4 }}>{selected.name}</div>
        <div style={{ fontSize: 14, color: "#6B7280", marginBottom: 32 }}>Enter your PIN</div>

        {/* PIN dots */}
        <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
          {dots.map(i => (
            <div key={i} style={{
              width: 18, height: 18, borderRadius: "50%",
              background: i < pin.length ? color : "#D1D5DB",
              transition: "background 0.15s",
            }} />
          ))}
        </div>

        {error && (
          <div style={{ fontSize: 13, color: "#C44444", fontWeight: 600, marginBottom: 20, background: "#FFE8E8", padding: "8px 16px", borderRadius: 50 }}>
            {error}
          </div>
        )}

        {/* Numpad */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, width: "100%", maxWidth: 280, opacity: signing ? 0.5 : 1 }}>
          {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((d, i) => {
            if (d === "") return <div key={i} />;
            const isBack = d === "⌫";
            return (
              <button key={i} onClick={() => isBack ? handleBack() : handleDigit(d)}
                disabled={signing}
                style={{
                  height: 72, borderRadius: 18, fontSize: isBack ? 22 : 26, fontWeight: 700,
                  background: isBack ? "#F0F3FA" : "#fff",
                  color: isBack ? "#6B7280" : "#0F172A",
                  border: "1.5px solid #E8EDF4",
                  cursor: "pointer", fontFamily: FONT,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                }}>
                {d}
              </button>
            );
          })}
        </div>

        <button onClick={() => { setSelected(null); setPin(""); setError(""); }}
          style={{ marginTop: 28, background: "none", border: "none", color: "#8B90A4", fontSize: 14, cursor: "pointer", fontFamily: FONT }}>
          Back to profiles
        </button>
      </div>
    );
  }

  // Child profile picker
  return (
    <div style={{ minHeight: "100vh", background: "#F5F6FA", fontFamily: FONT }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 13, color: "#6B7280", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
            {householdName}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0F172A", margin: 0 }}>Who are you?</h1>
        </div>

        {children.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 24px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1A2340", marginBottom: 8 }}>No child profiles yet</div>
            <div style={{ fontSize: 14, color: "#6B7280" }}>Ask a parent to add your profile first.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: children.length === 1 ? "1fr" : "1fr 1fr", gap: 16 }}>
            {children.map(child => {
              const color = getColor(child.name);
              return (
                <button key={child.id} onClick={() => { setSelected(child); setPin(""); setError(""); }}
                  style={{
                    background: "#fff", border: "1.5px solid #E8EDF4", borderRadius: 24,
                    padding: "32px 16px", display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 12, cursor: "pointer", fontFamily: FONT,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                  }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800 }}>
                    {child.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "#0F172A" }}>{child.name}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FamilyPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#F5F6FA", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{ color: "#8B90A4" }}>Loading…</div>
      </div>
    }>
      <FamilySwitchContent />
    </Suspense>
  );
}
