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
import { useI18n } from "@/lib/i18n/client";
import LanguageSetting from "@/components/LanguageSetting";

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
const STR = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IcBack() { return <svg width={20} height={20} viewBox="0 0 24 24" {...STR}><polyline points="15 18 9 12 15 6"/></svg>; }
function IcCamera() { return <svg width={15} height={15} viewBox="0 0 24 24" {...STR}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>; }

type Member = { id: string; userId: string; role: string; user: { id: string; name: string | null; email: string } };
type Invite = { id: string; email: string; createdAt: string };


export default function FamilyMembersPage() {
  const { data: session, status, update } = useSession();
  // 2026-10-03: admin "View as" for testing (lib/impersonation.ts).
  const isAdmin = !session?.impersonator && session?.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const [viewBusy, setViewBusy] = useState<string | null>(null);
  const router = useRouter();
  const media = useFamilyMedia();
  const { m: msg, err } = useI18n();
  const t = msg.members;

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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setError(t.enterValidEmail); return; }
    if (addKind === "child" && !name.trim()) { setError(t.enterName); return; }
    if (addKind === "child" && !guardianOk) { setError(t.tickGuardian); return; }
    setBusy(true); setError(null); setNeedsUpgrade(false);
    try {
      const res = addKind === "child"
        ? await fetch("/api/family/child-profiles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), email: em, guardianConsent: guardianOk }) })
        : await fetch("/api/household/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: em, role: adultRole }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ? err(d.error) : msg.common.somethingWentWrong);
        if (d.upgrade) setNeedsUpgrade(true);
        return;
      }
      setFlash(addKind === "child"
        ? d.existingAccount
          ? t.childExisting(em, name.trim())
          : t.childAdded(name.trim(), em)
        : t.inviteSent(em));
      setAddKind(null);
      await load();
    } catch { setError(msg.common.networkError); }
    finally { setBusy(false); }
  }

  // Children added before 2026-09-29 have no recorded confirmation yet.
  async function confirmConsent(childId: string) {
    if (!window.confirm(t.confirmGuardian)) return;
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
      ? t.deleteChildConfirm(display)
      : t.removeAdultConfirm(display);
    if (!window.confirm(text)) return;
    setRemoveBusy(m.userId); setRemoveError(null); setFlash(null);
    try {
      const res = isChild
        ? await fetch(`/api/household/deletion-requests/${encodeURIComponent(m.userId)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete" }) })
        : await fetch(`/api/household/members/${encodeURIComponent(m.id)}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setRemoveError(d.error ? err(d.error) : t.couldNotRemove); return; }
      setFlash(isChild ? t.childDeleted(display) : t.adultRemoved(display));
      await load();
    } catch { setRemoveError(msg.common.networkError); }
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
    } catch (e2) { setPhotoError(e2 instanceof Error ? err(e2.message) : msg.components.avatar.uploadFailed); }
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
    } catch (e2) { setPhotoError(e2 instanceof Error ? err(e2.message) : msg.components.avatar.uploadFailed); }
    finally { setPhotoBusy(null); }
  }

  if (status === "loading" || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{ color: "var(--muted)", fontSize: 15 }}>{t.loading}</div>
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
          <button onClick={() => router.back()} aria-label={msg.common.back} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-2)", display: "flex", padding: 4 }}>
            <IcBack />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "var(--fg)", margin: 0, flex: 1 }}>{t.title}</h1>
          <HamburgerMenu />
        </div>
      </div>

      <input ref={avatarInput} type="file" accept="image/*" onChange={onAvatarFile} style={{ display: "none" }} />
      <input ref={headerInput} type="file" accept="image/*" onChange={onHeaderFile} style={{ display: "none" }} />

      <main style={{ maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "20px 20px 120px" }}>
        {!hasHousehold ? (
          <div style={{ background: "var(--hero-grad)", borderRadius: 20, padding: "20px", color: "#fff" }}>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>{t.setUpTitle}</div>
            <div style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.5, marginBottom: 14 }}>
              {t.setUpBody}
            </div>
            <button onClick={createFamily} disabled={busy} style={{ background: "#fff", color: "#1C1C28", border: "none", borderRadius: 50, padding: "11px 20px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: FONT }}>
              {busy ? t.creating : t.createFamily}
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
                      aria-label={canPhoto ? t.changePhotoOf(display) : undefined}
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
                        {display}{m.userId === session?.user?.id ? <span style={{ color: "var(--subtle)", fontWeight: 600 }}>{t.youSuffix}</span> : null}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>
                        {t.roles[m.role] ?? m.role}
                        {m.role === "CHILD" && consents[m.userId] && <span>{t.guardianConfirmed}</span>}
                        {m.role === "CHILD" && !consents[m.userId] && canConsent && (
                          <>
                            {" · "}
                            <button onClick={() => confirmConsent(m.userId)} disabled={consentBusy === m.userId} style={{ background: "none", border: "none", padding: 0, color: "var(--warning)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                              {consentBusy === m.userId ? msg.common.saving : t.confirmAsGuardian}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                      {canPhoto && hasPhoto && (
                        <button onClick={() => removeAvatar(m.userId)} style={{ background: "none", border: "none", padding: 0, color: "var(--subtle)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                          {t.removePhoto}
                        </button>
                      )}
                      {isAdmin && m.userId !== session?.user?.id && (
                        <button onClick={async () => { setViewBusy(m.userId); if (!(await viewAs(update, m.userId))) { setViewBusy(null); setRemoveError(t.couldNotSwitch); } }}
                          disabled={viewBusy === m.userId} style={{
                          background: "var(--tint-accent)", border: "none", borderRadius: 50, padding: "6px 12px",
                          color: "var(--accent-strong)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT, opacity: viewBusy === m.userId ? 0.6 : 1,
                        }}>
                          {viewBusy === m.userId ? t.opening : t.viewAs}
                        </button>
                      )}
                      {isFamilyAdmin && m.role !== "OWNER" && m.userId !== session?.user?.id && (
                        <button onClick={() => removeMember(m)} disabled={removeBusy === m.userId} style={{
                          background: "var(--tint-danger)", border: "none", borderRadius: 50, padding: "6px 12px",
                          color: "var(--danger)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT, opacity: removeBusy === m.userId ? 0.6 : 1,
                        }}>
                          {removeBusy === m.userId ? t.removing : m.role === "CHILD" ? msg.common.delete : msg.common.remove}
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
                    <div style={{ fontSize: 12, color: "var(--subtle)", marginTop: 1 }}>{t.invitedWaiting}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", margin: "0 4px 22px", lineHeight: 1.45 }}>
              {t.photoHint}{isFamilyAdmin ? t.removeHint : ""}
            </div>

            {/* Add someone */}
            {isAdult && (
              <>
                <div style={{ fontSize: 17, fontWeight: 800, color: "var(--fg)", marginBottom: 10 }}>{t.addSomeone}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  {([["child", "👧", t.aChild, t.aChildSub], ["adult", "🧑", t.anAdult, t.anAdultSub]] as const).map(([k, emoji, title, sub]) => (
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
                        {t.onlyOwnerInvites}
                      </div>
                    ) : addKind === "child" && !familyAccess ? (
                      <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
                        {t.childIsPro} <Link href="/upgrade" style={{ color: "var(--accent)", fontWeight: 700 }}>{t.tryPro}</Link>
                      </div>
                    ) : (
                      <>
                        {addKind === "child" && (
                          <>
                            <label style={lbl}>{msg.common.name}</label>
                            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder} autoComplete="off" style={inp} autoFocus />
                          </>
                        )}
                        <label style={lbl}>{msg.common.email}</label>
                        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="off"
                          placeholder={addKind === "child" ? t.childEmailPlaceholder : t.adultEmailPlaceholder} style={inp} autoFocus={addKind === "adult"} />
                        {addKind === "adult" && (
                          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                            {([["PARENT", t.roles.PARENT], ["ADULT", t.otherAdult]] as const).map(([v, l]) => (
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
                            <span>{t.guardianText1}<Link href="/privacy" target="_blank" style={{ color: "var(--accent)", fontWeight: 700 }}>{t.privacyNotice}</Link>.</span>
                          </label>
                        )}
                        <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.45, marginBottom: 12 }}>
                          {addKind === "child"
                            ? t.childHelp
                            : t.adultHelp}
                        </div>
                        {error && (
                          <div style={{ fontSize: 13, color: "var(--danger)", marginBottom: 10 }}>
                            {error}{needsUpgrade && <> <Link href="/upgrade" style={{ color: "var(--accent)", fontWeight: 700 }}>{t.seePro}</Link></>}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 8 }}>
                          <button type="submit" disabled={busy} style={{ flex: 1, background: "var(--ink)", color: "#fff", border: "none", borderRadius: 50, padding: "13px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT, opacity: busy ? 0.6 : 1 }}>
                            {busy ? msg.common.sending : addKind === "child" ? t.addAndInvite : t.sendInvite}
                          </button>
                          <button type="button" onClick={() => setAddKind(null)} style={{ padding: "13px 18px", borderRadius: 50, background: "var(--surface-3)", border: "none", fontSize: 13, fontWeight: 700, color: "var(--fg-2)", cursor: "pointer", fontFamily: FONT }}>
                            {msg.common.cancel}
                          </button>
                        </div>
                      </>
                    )}
                  </form>
                )}
              </>
            )}

            {/* Family photo for Home */}
            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--fg)", margin: "8px 0 10px" }}>{t.familyPhoto}</div>
            <div style={{ background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)", overflow: "hidden" }}>
              {media.header ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={headerUrl(media.header)} alt={t.familyPhoto} style={{ width: "100%", height: 160, objectFit: "cover", display: "block", opacity: photoBusy === "header" ? 0.5 : 1 }} />
              ) : (
                <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", color: "var(--subtle)", fontSize: 13, opacity: photoBusy === "header" ? 0.5 : 1 }}>
                  {t.noFamilyPhoto}
                </div>
              )}
              <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, fontSize: 12.5, color: "var(--muted)", lineHeight: 1.4 }}>{t.familyPhotoHint}</div>
                {media.canEditHeader && (
                  <>
                    {media.header && (
                      <button onClick={() => removeHeader()} style={{ background: "none", border: "none", color: "var(--subtle)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>{msg.common.remove}</button>
                    )}
                    <button onClick={() => { setPhotoError(null); headerInput.current?.click(); }} disabled={photoBusy === "header"} style={{
                      display: "flex", alignItems: "center", gap: 6, background: "var(--ink)", color: "#fff", border: "none", borderRadius: 50,
                      padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT, flexShrink: 0,
                    }}>
                      <IcCamera /> {photoBusy === "header" ? t.uploading : media.header ? msg.common.change : t.choosePhoto}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 2026-10-04: the family's language — set by a family admin. */}
            <LanguageSetting />
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
