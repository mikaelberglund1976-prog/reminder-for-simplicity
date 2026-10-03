"use client";

// 2026-09-28 (test round, row 44): one place to see and add family members.
// Before this, children could only be added from Chores and adults only from
// deep in Settings. Also where family photos are set (row 40): a photo per
// person and the family photo shown at the top of Home.
import { useSession } from "next-auth/react";
import { viewAs } from "@/components/ImpersonationBar";
import { ADMIN_EMAIL } from "@/lib/adminConfig";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import HamburgerMenu from "@/components/HamburgerMenu";
import Avatar from "@/components/Avatar";
import { compressImage } from "@/lib/imageCompress";
import { headerUrl, removeAvatar, removeHeader, uploadAvatar, uploadHeader, useFamilyMedia } from "@/lib/familyMedia";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IcBack() { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><polyline points="15 18 9 12 15 6"/></svg>; }
function IcCamera() { return <svg width={15} height={15} viewBox="0 0 24 24" {...STR}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>; }

type Member = { id: string; userId: string; role: string; user: { id: string; name: string | null; email: string } };
type Invite = { id: string; email: string; createdAt: string };

const ROLE_LABEL: Record<string, string> = { OWNER: "Owner", PARENT: "Parent", ADULT: "Adult", CHILD: "Child", MEMBER: "Member" };

export default function FamilyMembersPage() {
  const { data: session, status, update } = useSession();
  // 2026-10-03: admin "View as" for testing (lib/impersonation.ts).
  const isAdmin = !session?.impersonator && session?.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const [viewBusy, setViewBusy] = useState<string | null>(null);
  const router = useRouter();
  const media = useFamilyMedia();

  const [loading, setLoading] = useState(true);
  const [hasHousehold, setHasHousehold] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [familyAccess, setFamilyAccess] = useState<boolean>(false);

  const [addKind, setAddKind] = useState<"child" | "adult" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [adultRole, setAdultRole] = useState<"PARENT" | "ADULT">("PARENT");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsUpgrade, setNeedsUpgrade] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  // 2026-09-29 (GDPR, launch list row 18): guardian confirmation.
  const [guardianOk, setGuardianOk] = useState(false);
  const [consents, setConsents] = useState<Record<string, { at: string; byName: string | null }>>({});
  const [canConsent, setCanConsent] = useState(false);
  const [consentBusy, setConsentBusy] = useState<string | null>(null);

  const [photoBusy, setPhotoBusy] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const headerInput = useRef<HTMLInputElement>(null);
  const [avatarTarget, setAvatarTarget] = useState<string | null>(null);
  // 2026-10-01 (phone test): remove people right here, not only deep in Settings.
  const [removeBusy, setRemoveBusy] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status]);

  async function load() {
    try {
      const [hRes, tRes, cRes] = await Promise.all([fetch("/api/household"), fetch("/api/family/trial"), fetch("/api/family/consent")]);
      if (cRes.ok) {
        const c = await cRes.json();
        setConsents(c.consents ?? {});
        setCanConsent(!!c.canConsent);
      }
      if (hRes.ok) {
        const d = await hRes.json();
        setHasHousehold(!!d.household);
        setMembers(d.household?.members ?? []);
        setInvites(d.household?.invites ?? []);
        setMyRole(d.role ?? null);
      }
      if (tRes.ok) {
        const t = await tRes.json();
        setFamilyAccess(!!(t.isPro || t.trialActive));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function createFamily() {
    setBusy(true);
    try {
      const res = await fetch("/api/household", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (res.ok) await load();
    } finally { setBusy(false); }
  }

  function openAdd(kind: "child" | "adult") {
    setAddKind(kind); setName(""); setEmail(""); setError(null); setNeedsUpgrade(false); setFlash(null); setGuardianOk(false);
  }

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    const em = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setError("Enter a valid email address"); return; }
    if (addKind === "child" && !name.trim()) { setError("Enter a name"); return; }
    if (addKind === "child" && !guardianOk) { setError("Tick the box to confirm you're the child's parent or guardian"); return; }
    setBusy(true); setError(null); setNeedsUpgrade(false);
    try {
      const res = addKind === "child"
        ? await fetch("/api/family/child-profiles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), email: em, guardianConsent: guardianOk }) })
        : await fetch("/api/household/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: em, role: adultRole }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ?? "Something went wrong");
        if (d.upgrade) setNeedsUpgrade(true);
        return;
      }
      setFlash(addKind === "child"
        ? d.existingAccount
          ? `✓ ${em} already has an account, so we sent an invite. Next time ${name.trim() || "they"} log in — with password or Google — they join your family as a child.`
          : `✓ ${name.trim()} is added — we emailed ${em} a link to choose a password. With a Gmail address they can also just tap “Continue with Google”.`
        : `✓ Invite sent to ${em}. They join as soon as they open the link.`);
      setAddKind(null);
      await load();
    } catch { setError("Network error"); }
    finally { setBusy(false); }
  }

  // Children added before 2026-09-29 have no recorded confirmation yet.
  async function confirmConsent(childId: string) {
    if (!window.confirm("Confirm that you're this child's parent or guardian and agree that their account and data are kept as described in the privacy notice?")) return;
    setConsentBusy(childId);
    try {
      const res = await fetch("/api/family/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ childId }) });
      if (res.ok) setConsents((c) => ({ ...c, [childId]: { at: new Date().toISOString(), byName: null } }));
    } finally { setConsentBusy(null); }
  }

  // A child account only exists for this family, so "remove" deletes the
  // account (soft delete — restorable for 60 days, same as Settings). An
  // adult keeps their own account and is just taken out of the family.
  async function removeMember(m: Member) {
    const display = m.user.name ?? m.user.email.split("@")[0];
    const isChild = m.role === "CHILD";
    const text = isChild
      ? `Delete ${display}'s account?\n\n${display} is removed from the family and can't log in any more. Homework, chores and activities assigned to ${display} stay, without an owner. The account is kept 60 days and can be restored on request.`
      : `Remove ${display} from the family?\n\n${display} keeps their own account but no longer sees the family's lists, chores or shared reminders.`;
    if (!window.confirm(text)) return;
    setRemoveBusy(m.userId); setRemoveError(null); setFlash(null);
    try {
      const res = isChild
        ? await fetch(`/api/household/deletion-requests/${encodeURIComponent(m.userId)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete" }) })
        : await fetch(`/api/household/members/${encodeURIComponent(m.id)}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setRemoveError(d.error ?? "Couldn't remove them"); return; }
      setFlash(isChild ? `✓ ${display}'s account is deleted. It can be restored within 60 days.` : `✓ ${display} is no longer in the family.`);
      await load();
    } catch { setRemoveError("Network error"); }
    finally { setRemoveBusy(null); }
  }

  function pickAvatar(userId: string) {
    setAvatarTarget(userId);
    setPhotoError(null);
    avatarInput.current?.click();
  }

  async function onAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !avatarTarget) return;
    setPhotoBusy(avatarTarget);
    try {
      const dataUrl = await compressImage(file, { mode: "square", size: 320 });
      await uploadAvatar(avatarTarget, dataUrl);
    } catch (err) { setPhotoError(err instanceof Error ? err.message : "Upload failed"); }
    finally { setPhotoBusy(null); }
  }

  async function onHeaderFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoBusy("header"); setPhotoError(null);
    try {
      const dataUrl = await compressImage(file, { mode: "fit", maxW: 1400, maxH: 1000, quality: 0.78 });
      await uploadHeader(dataUrl);
    } catch (err) { setPhotoError(err instanceof Error ? err.message : "Upload failed"); }
    finally { setPhotoBusy(null); }
  }

  if (status === "loading" || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{ color: "var(--muted)", fontSize: 15 }}>Loading family…</div>
      </div>
    );
  }

  const isOwner = myRole === "OWNER";
  // Family admin = OWNER, or a PARENT when the family has no OWNER (same rule as the API).
  const isFamilyAdmin = isOwner || (myRole === "PARENT" && !members.some((x) => x.role === "OWNER"));
  const isAdult = !!myRole && ["OWNER", "PARENT", "ADULT"].includes(myRole);
  const sorted = [...members].sort((a, b) => (a.role === "CHILD" ? 1 : 0) - (b.role === "CHILD" ? 1 : 0));

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", fontFamily: FONT }}>
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.back()} aria-label="Back" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-2)", display: "flex", padding: 4 }}>
            <IcBack />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "var(--fg)", margin: 0, flex: 1 }}>Family members</h1>
          <HamburgerMenu />
        </div>
      </div>

      <input ref={avatarInput} type="file" accept="image/*" onChange={onAvatarFile} style={{ display: "none" }} />
      <input ref={headerInput} type="file" accept="image/*" onChange={onHeaderFile} style={{ display: "none" }} />

      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "20px 20px 120px" }}>
        {!hasHousehold ? (
          <div style={{ background: "var(--hero-grad)", borderRadius: 20, padding: "20px", color: "#fff" }}>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>Set up your family</div>
            <div style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.5, marginBottom: 14 }}>
              Create your family first — then add your partner and children here.
            </div>
            <button onClick={createFamily} disabled={busy} style={{ background: "#fff", color: "#1C1C28", border: "none", borderRadius: 50, padding: "11px 20px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: FONT }}>
              {busy ? "Creating…" : "Create my family"}
            </button>
          </div>
        ) : (
          <>
            {flash && (
              <div style={{ fontSize: 13, color: "var(--success)", background: "var(--tint-success)", borderRadius: 12, padding: "10px 12px", marginBottom: 14, fontWeight: 600, lineHeight: 1.4 }}>
                {flash}
              </div>
            )}
            {removeError && (
              <div style={{ fontSize: 13, color: "var(--danger)", background: "var(--tint-danger)", borderRadius: 12, padding: "10px 12px", marginBottom: 14, fontWeight: 600 }}>
                {removeError}
              </div>
            )}
            {photoError && (
              <div style={{ fontSize: 13, color: "var(--danger)", background: "var(--tint-danger)", borderRadius: 12, padding: "10px 12px", marginBottom: 14, fontWeight: 600 }}>
                {photoError}
              </div>
            )}

            {/* People */}
            <div style={{ background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)", overflow: "hidden", marginBottom: 14 }}>
              {sorted.map((m, i) => {
                const canPhoto = media.canEditAvatarFor.includes(m.userId);
                const hasPhoto = !!media.avatars[m.userId];
                const display = m.user.name ?? m.user.email.split("@")[0];
                return (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderTop: i === 0 ? "none" : "1px solid var(--border-soft)" }}>
                    <button
                      onClick={() => canPhoto && pickAvatar(m.userId)}
                      disabled={!canPhoto}
                      aria-label={canPhoto ? `Change ${display}'s photo` : undefined}
                      style={{ position: "relative", background: "none", border: "none", padding: 0, cursor: canPhoto ? "pointer" : "default", opacity: photoBusy === m.userId ? 0.5 : 1 }}
                    >
                      <Avatar userId={m.userId} name={display} size={46} />
                      {canPhoto && (
                        <span style={{ position: "absolute", right: -3, bottom: -3, width: 22, height: 22, borderRadius: "50%", background: "var(--accent-bg)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 2px var(--surface)" }}>
                          <IcCamera />
                        </span>
                      )}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {display}{m.userId === session?.user?.id ? <span style={{ color: "var(--subtle)", fontWeight: 600 }}> (you)</span> : null}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>
                        {ROLE_LABEL[m.role] ?? m.role}
                        {m.role === "CHILD" && consents[m.userId] && <span> · Guardian confirmed</span>}
                        {m.role === "CHILD" && !consents[m.userId] && canConsent && (
                          <>
                            {" · "}
                            <button onClick={() => confirmConsent(m.userId)} disabled={consentBusy === m.userId} style={{ background: "none", border: "none", padding: 0, color: "var(--warning)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                              {consentBusy === m.userId ? "Saving…" : "Confirm as guardian"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                      {canPhoto && hasPhoto && (
                        <button onClick={() => removeAvatar(m.userId)} style={{ background: "none", border: "none", padding: 0, color: "var(--subtle)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                          Remove photo
                        </button>
                      )}
                      {isAdmin && m.userId !== session?.user?.id && (
                        <button onClick={async () => { setViewBusy(m.userId); if (!(await viewAs(update, m.userId))) { setViewBusy(null); setRemoveError("Couldn't switch to that person"); } }}
                          disabled={viewBusy === m.userId} style={{
                          background: "var(--tint-accent)", border: "none", borderRadius: 50, padding: "6px 12px",
                          color: "var(--accent-strong)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT, opacity: viewBusy === m.userId ? 0.6 : 1,
                        }}>
                          {viewBusy === m.userId ? "Opening…" : "👁 View as"}
                        </button>
                      )}
                      {isFamilyAdmin && m.role !== "OWNER" && m.userId !== session?.user?.id && (
                        <button onClick={() => removeMember(m)} disabled={removeBusy === m.userId} style={{
                          background: "var(--tint-danger)", border: "none", borderRadius: 50, padding: "6px 12px",
                          color: "var(--danger)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT, opacity: removeBusy === m.userId ? 0.6 : 1,
                        }}>
                          {removeBusy === m.userId ? "Removing…" : m.role === "CHILD" ? "Delete" : "Remove"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {invites.map((inv) => (
                <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderTop: "1px solid var(--border-soft)" }}>
                  <span style={{ width: 46, height: 46, borderRadius: "50%", border: "1.5px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--subtle)", fontSize: 18, flexShrink: 0 }}>✉︎</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.email}</div>
                    <div style={{ fontSize: 12, color: "var(--subtle)", marginTop: 1 }}>Invited · waiting to join</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", margin: "0 4px 22px", lineHeight: 1.45 }}>
              Tap a picture to add a photo — yours, or your children&apos;s.{isFamilyAdmin ? " Delete removes a child's account (restorable for 60 days); Remove takes an adult out of the family." : ""}
            </div>

            {/* Add someone */}
            {isAdult && (
              <>
                <div style={{ fontSize: 17, fontWeight: 800, color: "var(--fg)", marginBottom: 10 }}>Add someone</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  {([["child", "👧", "A child", "Own login, sees only their own things"], ["adult", "🧑", "An adult", "Partner or other adult, full access"]] as const).map(([k, emoji, title, sub]) => (
                    <button key={k} onClick={() => openAdd(k)} aria-pressed={addKind === k} style={{
                      textAlign: "left", padding: "14px 12px", borderRadius: 16, cursor: "pointer", fontFamily: FONT,
                      background: addKind === k ? "var(--tint-accent)" : "var(--surface)",
                      border: addKind === k ? "2px solid var(--accent)" : "1px solid var(--border)",
                    }}>
                      <div style={{ fontSize: 22, marginBottom: 6 }}>{emoji}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--fg)" }}>{title}</div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2, lineHeight: 1.35 }}>{sub}</div>
                    </button>
                  ))}
                </div>

                {addKind && (
                  <form onSubmit={submitAdd} style={{ background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)", padding: 16, marginBottom: 22 }}>
                    {addKind === "adult" && !isOwner ? (
                      <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
                        Only the family owner can invite adults. Ask them to add the person here.
                      </div>
                    ) : addKind === "child" && !familyAccess ? (
                      <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
                        Child accounts are part of Pro. <Link href="/upgrade" style={{ color: "var(--accent)", fontWeight: 700 }}>Try Pro free for 14 days →</Link>
                      </div>
                    ) : (
                      <>
                        {addKind === "child" && (
                          <>
                            <label style={lbl}>Name</label>
                            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emma" autoComplete="off" style={inp} autoFocus />
                          </>
                        )}
                        <label style={lbl}>Email</label>
                        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="off"
                          placeholder={addKind === "child" ? "emma@example.com or you+emma@gmail.com" : "partner@example.com"} style={inp} autoFocus={addKind === "adult"} />
                        {addKind === "adult" && (
                          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                            {([["PARENT", "Parent"], ["ADULT", "Other adult"]] as const).map(([v, l]) => (
                              <button key={v} type="button" onClick={() => setAdultRole(v)} style={{
                                flex: 1, padding: "10px 8px", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT,
                                background: adultRole === v ? "var(--ink)" : "var(--surface)", color: adultRole === v ? "#fff" : "var(--fg-2)",
                                border: adultRole === v ? "none" : "1.5px solid var(--border)",
                              }}>{l}</button>
                            ))}
                          </div>
                        )}
                        {addKind === "child" && (
                          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "var(--fg)", lineHeight: 1.45, marginBottom: 12, cursor: "pointer" }}>
                            <input type="checkbox" checked={guardianOk} onChange={(e) => setGuardianOk(e.target.checked)} style={{ width: 18, height: 18, marginTop: 1, flexShrink: 0, accentColor: "var(--accent)" }} />
                            <span>I&apos;m the child&apos;s parent or guardian, and I agree that the child&apos;s account and what the family adds for them (homework, chores, activities, wishlist, photo) are kept as described in the <Link href="/privacy" target="_blank" style={{ color: "var(--accent)", fontWeight: 700 }}>privacy notice</Link>.</span>
                          </label>
                        )}
                        <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.45, marginBottom: 12 }}>
                          {addKind === "child"
                            ? "We email a link to confirm the address and choose a password — or, with a Google address, they just tap “Continue with Google”. Already made an account themselves? Use that email and they join at their next login. Children only see their own homework, chores, activities and wishlist."
                            : "We email an invite link. They join your family when they open it and sign in."}
                        </div>
                        {error && (
                          <div style={{ fontSize: 13, color: "var(--danger)", marginBottom: 10 }}>
                            {error}{needsUpgrade && <> <Link href="/upgrade" style={{ color: "var(--accent)", fontWeight: 700 }}>See Pro →</Link></>}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 8 }}>
                          <button type="submit" disabled={busy} style={{ flex: 1, background: "var(--ink)", color: "#fff", border: "none", borderRadius: 50, padding: "13px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT, opacity: busy ? 0.6 : 1 }}>
                            {busy ? "Sending…" : addKind === "child" ? "Add & send invite" : "Send invite"}
                          </button>
                          <button type="button" onClick={() => setAddKind(null)} style={{ padding: "13px 18px", borderRadius: 50, background: "var(--surface-3)", border: "none", fontSize: 13, fontWeight: 700, color: "var(--fg-2)", cursor: "pointer", fontFamily: FONT }}>
                            Cancel
                          </button>
                        </div>
                      </>
                    )}
                  </form>
                )}
              </>
            )}

            {/* Family photo for Home */}
            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--fg)", margin: "8px 0 10px" }}>Family photo</div>
            <div style={{ background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)", overflow: "hidden" }}>
              {media.header ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={headerUrl(media.header)} alt="Family photo" style={{ width: "100%", height: 160, objectFit: "cover", display: "block", opacity: photoBusy === "header" ? 0.5 : 1 }} />
              ) : (
                <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", color: "var(--subtle)", fontSize: 13, opacity: photoBusy === "header" ? 0.5 : 1 }}>
                  No family photo yet
                </div>
              )}
              <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, fontSize: 12.5, color: "var(--muted)", lineHeight: 1.4 }}>Shown at the top of Home for everyone in the family.</div>
                {media.canEditHeader && (
                  <>
                    {media.header && (
                      <button onClick={() => removeHeader()} style={{ background: "none", border: "none", color: "var(--subtle)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>Remove</button>
                    )}
                    <button onClick={() => { setPhotoError(null); headerInput.current?.click(); }} disabled={photoBusy === "header"} style={{
                      display: "flex", alignItems: "center", gap: 6, background: "var(--ink)", color: "#fff", border: "none", borderRadius: 50,
                      padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT, flexShrink: 0,
                    }}>
                      <IcCamera /> {photoBusy === "header" ? "Uploading…" : media.header ? "Change" : "Choose photo"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "var(--fg-2)", display: "block", marginBottom: 6 };
const inp: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 12, border: "1.5px solid var(--border)", fontSize: 15,
  fontFamily: FONT, outline: "none", boxSizing: "border-box", marginBottom: 12, background: "var(--surface-2)", color: "var(--fg)",
};
