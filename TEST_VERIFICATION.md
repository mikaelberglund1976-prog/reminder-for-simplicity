# Test & Verifiering – öppna punkter
**Skapat:** 2026-07-28 | **Uppdaterad:** 2026-09-27 (§6 = 2026-08-18-ändringarna, live; §7 = punkt 31, kräver deploy först. PIN-rader i §2–3 är inaktuella – PIN pensionerad). Inget av nedan är klicktestat i produktion.

Bocka av varje rad efter att du testat den skarpt (inte bara läst koden). Rader utan `[x]` betyder "inte verifierat".

---

## 0. Kalendervy (2026-07-28, commit `0a3032e`) — **ny, kräver push först**
- [ ] `git push` – denna commit ligger bara lokalt i sandboxen, precis som tidigare (ingen GitHub-auth där). Kolla Vercel efter push att den blir grön.
- [ ] Fjärde fliken "Calendar" syns i bottenmenyn, bredvid Reminders/Shopping list/Wishlist.
- [ ] Månadsgriden visar rätt prickar på rätt dagar för en vanlig engångs-reminder (t.ex. ett abonnemangsdatum).
- [ ] En WEEKLY/MONTHLY/YEARLY-återkommande reminder visar flera prickar (en per förekomst) när du bläddrar framåt/bakåt en månad.
- [ ] En syssla (chore) med `choreRecurrenceDays` (t.ex. vardagar) visar prickar bara på rätt veckodagar, i en annan färg än reminders.
- [ ] Klick på en dag visar rätt lista av poster under griden.
- [ ] Klick på en reminder-post öppnar rätt reminder-detalj.
- [ ] Klick på en syssla-post tar dig till Family-hubben (sysslor saknar egen detaljsida ännu — medvetet, se kod-kommentar i `calendar/page.tsx`).
- [ ] "Today"-knappen och pil-navigeringen fungerar, dagens datum är visuellt markerat.
- [ ] Som barnprofil: `/dashboard/calendar` ska omdirigera till barnets egen vy, inte visa kalendern.
- [ ] Ingen synlig data-läcka: en PRIVATE reminder från en annan hushållsmedlem ska inte dyka upp i din kalender (samma regel som `/api/reminders` redan följer).

## 1. Vercel-deploy
- [ ] Kolla Vercel-dashboarden: senaste deployen (`3a770b4` eller senare) visar "Ready", inte "Error".
  - Tidigare tre deploys blev röda på grund av `passwordSchema`-exportfelet – detta är den enda riktiga bekräftelsen på att fixen fungerade.

## 2. Wishlist-fixen (2026-07-28)
- [ ] Som förälder: öppna Wishlist för ett barn som *aldrig* loggat in själv → listan ska ändå finnas ("No child profiles yet" ska inte visas felaktigt).
- [ ] Som förälder: klicka "+ New list" och skapa en ny önskelista åt ett barn.
- [ ] Redigera ett barnkonto (namn/email) via Profile → Child accounts → "Edit". *(PIN borttaget 2026-09-27 – byte av email skickar ny inbjudan.)*

## 3. Fem quick wins (Best4Family-analys, 2026-07-28)
- [x] ~~Logga in via PIN på ett Google-länkat konto~~ – inaktuell, PIN pensionerad 2026-09-27.
- [ ] Sekretess-chip: skapa en PRIVATE och en PARENTS reminder i ett hushåll med flera medlemmar → taggen ska synas på rätt rader, inte på HOUSEHOLD-reminders.
- [ ] Dataexport: Profile → Security → "Export my data" → verifiera att JSON-filen innehåller profil, reminders, tillagda inköps-/önskelistevaror och hushållsmedlemskap – inte andra medlemmars data.
- [ ] Broadcast-notis: skicka en "family update" som OWNER/PARENT → verifiera att alla vuxna utom avsändaren får mailet, och att barnprofiler inte får det.

## 4. Äldre, aldrig skarpt testade delar
- [ ] Glömt lösenord end-to-end (begär → mail → återställ → logga in med nytt lösenord).
- [ ] PWA på en riktig telefon (installation, offline-ikon, service worker).
- [ ] Hamburgermeny – alla länkar (Family/Settings/Admin/Sign out), Admin bara synlig för admin-email.
- [ ] Ny startsida – rubrik, tre feature-pills, telefonmockup.
- [ ] Mobil/webb-vy-växlare i Profile → Preferences.

## 5. Multi-lista / åtkomststyrning (4l)
- [ ] Skapa en andra inköpslista i samma hushåll.
- [ ] Dela en enskild lista (inte hela hushållet) via länk.
- [ ] Åtkomstpanel: begränsa en lista till valda medlemmar, verifiera att övriga inte ser den.
- [ ] Lägg till en vara med notis, länk och bild-URL – verifiera att alla tre visas korrekt.

## 6. Familjebegränsningar + UI (2026-08-18, commit `35fb226`, live)
- [ ] Tilldela en syssla, en aktivitet och en läxa till en **vuxen** (inte barn) – syns rätt för den personen.
- [ ] Önskelista som vuxen: fliken "My wishlist" – skapa en egen önskning; fliken "Family" visar övrigas.
- [ ] Family → "Add child" direkt i översikten.
- [ ] Nytt syssla/aktivitet-formulär: ingen typväxlare, rätt typ skapas från respektive ingång.
- [ ] Inköpslista → Browse: tvåkolumnslista, fler varor per kategori.
- [ ] Kalender → månadsvy: titlar syns i dagrutorna.

## 7. Punkt 31 – kräver `db push` + migreringsscript + Resend-domän + deploy först
- [ ] Registrera nytt konto → "Check your inbox" → klicka länken → "Email confirmed" → logga in.
- [ ] Logga in innan bekräftelse → felmeddelande + "Resend confirmation email" fungerar.
- [ ] Skapa barnkonto (namn + e-post) → barnet får mail → väljer lösenord → loggar in → hamnar i barnvyn med Läxor & prov överst.
- [ ] Profile → Child accounts: "Not confirmed yet · Resend invite" för gamla PIN-barn.
- [ ] Gammal länk `/family?h=...` → login-sidan med förklaring om att PIN är pensionerad.
- [ ] Radering som vanlig medlem → "Deletion requested" → admin ser kortet i Profile/Family → Approve (personen utloggad, dold ur familjen) resp. Decline.
- [ ] Radering som admin med annan vuxen → den vuxne blir admin. Som enda vuxen med barn → blockerad med förklaring.
- [ ] Admin raderar ett barnkonto via "Delete".
- [ ] `/admin` → Deleted: dagar kvar visas, Restore lägger tillbaka personen i familjen, Delete now raderar permanent.
- [ ] Läxor & prov: lägg till läxa + prov med ämne och datum, nedräkning stämmer, bocka av → hamnar under "Done".
- [ ] 📅-knappen döljer/visar posten i kalendern och i ICS-flödet.
- [ ] Mail dagen före kommer till barnet (och till föräldern som skapade posten), inte om posten är avbockad.

---

*När en sektion är helt avbockad, flytta den till "Klart" i `TODO.md` och ta bort raderna härifrån.*
