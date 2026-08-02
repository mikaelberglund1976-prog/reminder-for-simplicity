# Launch Checklist – Reminder for Simplicity (konsoliderad 2026-08-02)

**Syfte:** en enda, avdubblerad, omprioriterad lista över allt som återstår innan produkten är "helt klar" för bred lansering. Ersätter inte `TODO.md` (som förblir den kronologiska arbetsloggen/historiken) utan sitter ovanpå den – det här dokumentet är **den aktuella sanningen om vad som är kvar**, `TODO.md` är **hur vi kom hit**.
**Metod:** allt `- [ ]` extraherat ur `TODO.md` (punkt 1–25), `PRODUCT_SPEC.md`, `ROADMAP.md`, `OPERATIONS.md`, `APP_STORE_READINESS.md`, dubbletter slagna ihop, omgrupperat i faser efter vad som faktiskt blockerar vad.
**Uppdatera detta dokument** när en punkt blir klar (bocka av `- [x]`) eller när prioritet ändras – det tappar sitt värde annars.

---

## Först: ett obesvarat beslut som påverkar allt nedan

- [ ] **Fas 1-beta eller fortsätt bygga Fas 2 rakt av?** (öppnat i `TODO.md` punkt 8/12, aldrig besvarat.) Påverkar om Fas A nedan ska göras *innan* riktiga externa användare, eller om ni redan kör med riktiga användare och det är mer akut än det ser ut.

---

## Fas A – Blockerare innan bred lansering/betalande användare

Ingen inbördes teknisk ordning inom fasen, men allt här bör vara klart innan Fas B/C påbörjas på allvar.

**Säkerhet (från säkerhetsgranskningen 2026-08-02, `OPERATIONS.md` §8) — kodat 2026-08-02:**
- [x] **P0 – Rate limiting/lockout på inloggning**, lösenord och PIN. `lib/rateLimit.ts` (nytt), kopplat in i `lib/auth.ts` – 5 misslyckade försök inom 15 min låser kontot i 15 min, delat mellan lösenords- och PIN-inloggning. **Känd begränsning: in-memory (per serverless-instans), inte en delad/global spärr** – höjer kostnaden för att gissa ett känt konto rejält, men är inte en fullständig lösning. Rekommenderad uppgradering senare: Upstash Redis. `tsc --noEmit` kört rent. **Kräver `git push` + Vercel-deploy för att bli skarp**, se längst ner i denna fil.
- [ ] **P0 – Se över hur barnprofilers email genereras** (gissbart mönster + obegränsade PIN-försök = praktisk brute-force-väg). Inte kodat än – kräver ett produktbeslut om hur email-fältet ska genereras/valideras, inte bara en teknisk fix.
- [x] P1 – `CRON_SECRET`-jämförelse: bytt från `!==` till `crypto.timingSafeEqual` (`api/cron/send-reminders/route.ts`). Kodat, `tsc --noEmit` rent.
- [x] P1 – `ADMIN_EMAIL` läser nu `process.env.ADMIN_EMAIL` i `lib/adminConfig.ts` istället för att hårdkoda. **Nyans värd att känna till:** tre av de fyra ställena som importerar detta är `"use client"`-komponenter (menyn, admin-sidan, suggestions-sidan) – utan `NEXT_PUBLIC_`-prefix bakas env-variabeln aldrig in i klientbundeln, så de faller fortfarande tillbaka på samma hårdkodade default som förut (ofarligt, eftersom den riktiga spärren alltid varit server-side). Fixen är fullt verksam för den fjärde platsen, en server-route (`api/suggestions/[id]/route.ts`). Om ni vill att en framtida env-rotation ska slå igenom även i klient-UI:t krävs en separat `NEXT_PUBLIC_ADMIN_EMAIL` – inte gjort, egen liten uppgift om ni vill ha den.

**Juridik/GDPR (COPPA-deadline redan passerad, se `APP_STORE_READINESS.md` §5):**
- [ ] Komplett, publicerad Privacy Policy (struktur klar sedan 4b.28, 7 punkter kvar: juridisk enhet, Vercel/Resend DPA-status, datalagringstid, kontaktadress m.fl.).
- [x] **Beslutat 2026-08-02:** ingen fast åldersgräns för barnprofiler – bara föräldrasamtycke (skapande föräldern samtycker vid skapandet). Mikael valde bort förslaget om en 13-årsgräns. **Medveten avvägning, inte ett misstag:** svagare COPPA-efterlevnadsposition om appen någonsin distribueras i USA (COPPA:s skärpta 2026-regler kopplar särskilt an till en tydlig åldersgräns) – värt att ha med sig om/när ni tar det beslutet igen inför en amerikansk lansering. Ska in i Privacy Policy-texten när den skrivs.
- [ ] Självbetjänings-"radera mitt konto permanent" – riktig backend-radering, inte bara UI-shell. **Nu även en hård Apple-blockerare** (Guideline 5.1.1(v)), inte bara ett GDPR-önskemål. Inte kodat än.

**Löst 2026-08-02 – motsägelse mellan marknadsföring och kod (`PRODUCT_SPEC.md` §7.2):**
- [x] `/features` lovade gratis "household sharing", men koden krävde `is_pro` för att bjuda in hushållsmedlemmar, dela en reminder inom hushållet, och överlämna (handover) en reminder. **Mikael godkände rekommendationen: alla tre är nu gratis** – `api/household/invite`, `api/reminders` (POST+PATCH), `api/reminders/[id]/handover`. Pro-gränsen ligger nu bara vid de faktiska familjefunktionerna (inköpslista, önskelista, sysslor, m.fl. – oförändrat). `tsc --noEmit` kört rent. **Ingen schemaändring**, bara borttagen kod – redo för `git push`.

**Kontosammanslagning (mindre akut, men enkelt):**
- [ ] Bekräftelseskärm innan Google/lösenord-kontosammanslagning sker automatiskt (händer idag tyst).

**Nytt fynd 2026-08-02 – onboarding-genomgång (`PRODUCT_SPEC.md` 4b.32):**
- [ ] **Stäng av eller ersätt admin-godkännande-gaten innan bred lansering.** Varje nytt konto är idag blockerat från att logga in alls tills en människa manuellt godkänt det i `/admin` – rätt för nuvarande stängda testfas (bekräftat av Mikael, inga externa användare än), men bryter helt mot "visa värde innan vi ber om något" (§9) och mot vad en ny användare/app store-granskare förväntar sig. Fanns inte som egen punkt i den ursprungliga versionen av den här listan – ett genuint gap, tillagt nu.

---

## Fas B – Betalning (innan riktiga pengar tas emot)

**Redan klart, inget att göra:** 7-dagars gratis Pro-trial är fullt byggd och fungerar (`FamilyTrial`, "Start free 7-day trial →"-knapp) – se `PRODUCT_SPEC.md` §7.3.

- [ ] **Beslut krävs INNAN Stripe kodas:** betalmetod för en framtida iOS-app. Inom EU (primärmarknad) kan Apples "External Purchase Link Entitlement" tillåta Stripe direkt; utanför EU krävs Apples egen In-App Purchase (15–30% avgift). Se `APP_STORE_READINESS.md` §4.
- [ ] Bygg riktig Stripe-integration – ersätter dagens manuella `is_pro`-admin-toggle.
- [x] **Pris beslutat 2026-08-02: 49 kr/mån / 399 kr/år** – grundat i konkurrentprissättning (Cozi Gold $39/år, TickTick $35,99/år), se `PRODUCT_SPEC.md` §7.1. Kvarstår: `/features`-texten säger fortfarande "not final yet" och behöver uppdateras när Stripe närmar sig.
- [ ] Transparent debiteringstidslinje i UI när Stripe byggs (UX-princip från `COMPETITOR_ANALYSIS_TASKAPPS.md`, à la Structured) – bygg in samtidigt, inte som eftertanke.

---

## Fas C – App store-lansering (Apple + Google)

Beror på att Fas A är klar (kontoradering + Privacy Policy är hårda krav från båda butikerna) och att Fas B:s iOS-betalbeslut är taget. Fullständig research: `APP_STORE_READINESS.md`.

**Android/Google Play – lågt jobb:**
- [ ] `assetlinks.json` i `/.well-known/` (domänverifiering).
- [ ] Lighthouse PWA-audit, verifiera poäng ≥80 (okänt nuläge idag).
- [ ] Paketera med Bubblewrap/PWABuilder, sätt upp Play Console ($25 engångsavgift).
- [ ] Data Safety-formulär (deklarera barns data).

**iOS/Apple – eget utvecklingsprojekt:**
- [ ] Hybrid-app (rekommenderat: Capacitor) med minst en genuin native-funktion – naturlig kandidat: riktiga push-notiser, eller native streckkodsskanning (löser samtidigt att dagens `BarcodeDetector` inte funkar i Safari, känt gap sedan 4b.27).
- [ ] Apple Developer Program, $99/år.

---

## Fas D – UX quick wins (låg komplexitet, redan analyserade)

Från `COMPETITOR_ANALYSIS_TASKAPPS.md`/`PRODUCT_SPEC.md` 4b.30. Kan göras när som helst, inget beroende på Fas A–C. **Omprioriterad 2026-08-02** som produktteam – gruppen nedan (1) hör ihop och bör byggas i samma omgång, resten är fristående.

**Ett paket, samma UI-yta – gör tillsammans:**
1. [ ] **Belöningspaketet för Sysslor:** poäng/stjärnor per godkänd syssla (beslut, `PRODUCT_SPEC.md` 4b.3) + kvantitativ vy ("3 av 5 denna vecka", datan finns redan) + streak/"gjort över tid"-indikator (återanvänder `/api/family/stats`). Tre separata punkter i den ursprungliga listan, men samma skärm/samma databehov – onödigt att bygga i tre separata omgångar.
2. [ ] Micro-gratifikation (t.ex. konfetti) vid första avklarade reminder/godkända syssla – billigast, gör först, hör naturligt ihop med belöningspaketet ovan.

**Fristående, egen prioritet:**
- [ ] Klicktesta och dokumentera det faktiska onboarding-flödet (Register → första värde) – **lägre brådska än tidigare bedömt**, eftersom admin-godkännande-gaten (Fas A, nytt fynd) ändå blockerar hela flödet just nu. Gör detta samtidigt som gaten stängs av, inte innan.
- [ ] Riktigt prediktiva inköpsförslag (utöver dagens kategori-minne) – större jobb än övriga i denna fas, lägst prioritet.
- [ ] "Placeholder mode" för skärmdumpar, särskilt önskelistan.

---

## Fas E – Nya funktioner / produktutökningar

- [ ] **"Guest"-roll** – dela en enskild lista med någon utanför hushållet, kräver inloggning (beslutad modell, `PRODUCT_SPEC.md` 4b.31). *Städ: `ROADMAP.md`s gamla idé "gästprofiler utan inloggning" (Fas 1.5-kandidat) motsäger detta beslut – ta bort eller uppdatera den raden.*
- [x] ~~Belöningar kopplat till godkända Sysslor~~ **Beslutat 2026-08-02** – poäng/stjärnor, se Fas D punkt 1 ovan (flyttad dit, hör ihop med kvantitativ vy/streak).
- [ ] Admin-switch per funktionstyp ("tillåt medlemmar skapa X").
- [ ] Måltidsplanerare kopplad till inköpslistan.
- [ ] Kostnadssummering per kategori.
- [ ] Månatlig email-digest.
- [ ] CSV-import.
- [ ] Push-notiser (PWA-grunden finns, push-logiken saknas).
- [ ] **Inkommande ICS-prenumeration för Activities** (klubb-/skolkalender in i appen, hette "Training" innan namnbytet 2026-08-02, se `PRODUCT_SPEC.md` 4b.33) – **väg beslutad 2026-08-02: offentlig .ics-länk, ingen Google/Outlook-inloggning** (se `ROADMAP.md`), bekräftat slutgiltigt. Själva byggarbetet inte gjort än.
- [ ] Receptimport via foto (OCR/Tesseract.js) – medvetet väntat, kräver nytt npm-beroende + telefontest.
- [ ] Google/Apple Calendar tvåvägssynk (skiljer sig från redan byggd envägs-export).
- [ ] SMS-påminnelser, API för tredjepart, affiliate-program – Fas 3, lågprioriterat.
- [x] ~~"Föräldrautrymme"-modul~~ **Bekräftat parkerad av Mikael 2026-08-02** (var en rekommendation, nu ett beslut) – till efter lansering. Se `ROADMAP.md` Parkerade idéer.

*Se `ROADMAP.md` "Parkerade idéer" för allt som redan är medvetet lågprioriterat (röststyrning, platsnotiser, skafferihantering, Föräldrautrymme-modul, m.fl.) – upprepas inte här.*

---

## Fas F – Teknisk skuld / drift

- [ ] Next.js 14.2 → 16 (kända CVE:er: DoS, cache-poisoning, SSRF) – egen sprint, för stort för att göra i förbifarten.
- [ ] Prisma 5.22 → 7.9 (major-uppgradering).
- [ ] `npm install` lokal synk av `node_modules` (måste göras på riktig dator, inte i sandbox).
- [ ] Error tracking (Sentry eller liknande) – skulle bland annat ha upptäckt ovanliga inloggningsmönster snabbare, se Fas A säkerhet.
- [ ] Uptime-monitoring/alerting.
- [ ] Verifierad egen avsändardomän för email (idag `onboarding@resend.dev`).
- [ ] Formell migrations-historik (`prisma migrate` istället för `db push`).
- [ ] Backup-schema utöver Supabase standard.

---

## Fas G – Samlad QA-runda innan lansering

Stor mängd funktioner är byggda men aldrig klicktestade skarpt (utspritt över `TODO.md` punkt 7/10/11/12/13/18/20). Istället för att lista varje enskild funktion separat: kör **en enda sammanhängande QA-runda** genom hela appen innan lansering, med särskilt fokus på: School/Training/kalendersynk, anpassningsbar bottenmeny, streckkodsskanning + butiksläge, admin-godkännande end-to-end, och allt i Fas A ovan.

---

## Kodändringar gjorda 2026-08-02 – redo för deploy

**Omgång 1 (säkerhet + gratis hushållsdelning):** fem filer ändrade, en ny fil (`lib/rateLimit.ts`).

**Omgång 2 (Training → Activity):** elva filer ändrade, ren text-/emoji-/mallbyte, ingen logikändring.

Ingen schemaändring i någon av omgångarna – ingen `db push`/`prisma generate` krävs. `tsc --noEmit` kört rent (exit 0) efter varje ändring. Ligger i din riktiga projektmapp, inte pushat än:

- `git add -A && git commit -m "security: rate limiting, timing-safe cron secret, consistent ADMIN_EMAIL, free household sharing; rename Training to Activity in UI" && git push`
- Bekräfta grön deploy i Vercel-dashboarden som vanligt (se `OPERATIONS.md` §5 – `tsc` rent garanterar inte en grön `next build`).
- **Klicktesta innan ni litar på det:** 5 felaktiga lösenords-/PIN-försök i rad ska låsa kontot i 15 minuter (testa på ett testkonto, inte ditt eget – låsningen är på riktigt); bjud in en medlem till ett hushåll som INTE är Pro och bekräfta att det fungerar nu; dela en reminder (visibility → Household) i ett icke-Pro-hushåll och bekräfta att den faktiskt syns för de andra; öppna Activities-sidan/menyn/kalendern och kolla att inget "Training"/⚽ syns kvar.

---

## Vad som redan är klart och inte behöver oroa er (för sammanhanget)

Bara som påminnelse så ingen råkar lägga tid på att "fixa" något som redan fungerar: bcrypt-hashning, NextAuth-sessions, korrekt hemlighetshantering, konsekventa ägarskapskontroller (IDOR), adminpanelens åtkomstspärr, ogissbara/roterbara delningstokens, barn-dataskyddet i önskelistan, PWA-grunden (manifest+service worker), och **den 7-dagars Pro-trialen** (se Fas B).
