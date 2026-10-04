# Launch Checklist – Reminder for Simplicity (konsoliderad 2026-08-02)

**Syfte:** en enda, avdubblerad, omprioriterad lista över allt som återstår innan produkten är "helt klar" för bred lansering. Ersätter inte `TODO.md` (som förblir den kronologiska arbetsloggen/historiken) utan sitter ovanpå den – det här dokumentet är **den aktuella sanningen om vad som är kvar**, `TODO.md` är **hur vi kom hit**.
**Metod:** allt `- [ ]` extraherat ur `TODO.md` (punkt 1–25), `PRODUCT_SPEC.md`, `ROADMAP.md`, `OPERATIONS.md`, `APP_STORE_READINESS.md`, dubbletter slagna ihop, omgrupperat i faser efter vad som faktiskt blockerar vad.
**Senast synkad:** 2026-10-04 (kväll) – svenska + flerspråksstöd LIVE, språk per familj (`RELEASE_2026-10-04b.md`, `TODO.md` punkt 40). Före det: 2026-10-04 – mobiltestets fynd 4 okt LIVE (`RELEASE_2026-10-04.md`, `TODO.md` punkt 39). Före det: 2026-10-03 – barnets startsida, radera medlemmar, Home först, SchoolSoft-import LIVE (`RELEASE_2026-10-01.md`, `RELEASE_2026-10-03.md`, `TODO.md` punkt 36–37). Före det: 2026-09-29 – mobiltestets fynd (rad 36–48), barnkonton med eget konto/Google och GDPR-åtgärderna LIVE (se `RELEASE_2026-09-28b.md`, `RELEASE_2026-09-29.md`, `GDPR.md`, `TODO.md` punkt 33–35). Tidigare: 2026-09-28 punkt 31 + UI-review + planer/reklam.
**Obs:** den gemensamma lanseringslistan för alla Assistiq-appar (namn, bolag, webb, GDPR, betalning) finns i Claude Docs ("Genomlysning: Assistiq inför kommersiell lansering", fliken Todo-lista). Den här filen är appens egen tekniska checklista.
**Uppdatera detta dokument** när en punkt blir klar (bocka av `- [x]`) eller när prioritet ändras – det tappar sitt värde annars.

---

## Först: ett obesvarat beslut som påverkar allt nedan

- [ ] **Fas 1-beta eller fortsätt bygga Fas 2 rakt av?** (öppnat i `TODO.md` punkt 8/12, aldrig besvarat.) Påverkar om Fas A nedan ska göras *innan* riktiga externa användare, eller om ni redan kör med riktiga användare och det är mer akut än det ser ut.

---

## Fas A – Blockerare innan bred lansering/betalande användare

Ingen inbördes teknisk ordning inom fasen, men allt här bör vara klart innan Fas B/C påbörjas på allvar.

**Säkerhet (från säkerhetsgranskningen 2026-08-02, `OPERATIONS.md` §8) — kodat 2026-08-02:**
- [x] **P0 – Rate limiting/lockout på inloggning**, lösenord och PIN. `lib/rateLimit.ts` (nytt), kopplat in i `lib/auth.ts` – 5 misslyckade försök inom 15 min låser kontot i 15 min, delat mellan lösenords- och PIN-inloggning. **Känd begränsning: in-memory (per serverless-instans), inte en delad/global spärr** – höjer kostnaden för att gissa ett känt konto rejält, men är inte en fullständig lösning. Rekommenderad uppgradering senare: Upstash Redis. `tsc --noEmit` kört rent. **Kräver `git push` + Vercel-deploy för att bli skarp**, se längst ner i denna fil.
- [x] **P0 – Barnprofilers gissbara email + PIN** — **löst 2026-09-27 genom att ta bort PIN helt.** Beslut (Mikael): alla konton = verifierad e-post + lösenord, eller Google. Nya konton får verifieringsmail; barnkonton skapas av förälder med namn + e-post och barnet får en länk för att bekräfta och välja lösenord. Se `TODO.md` punkt 31.
- [x] P1 – `CRON_SECRET`-jämförelse: bytt från `!==` till `crypto.timingSafeEqual` (`api/cron/send-reminders/route.ts`). Kodat, `tsc --noEmit` rent.
- [x] P1 – `ADMIN_EMAIL` läser nu `process.env.ADMIN_EMAIL` i `lib/adminConfig.ts` istället för att hårdkoda. **Nyans värd att känna till:** tre av de fyra ställena som importerar detta är `"use client"`-komponenter (menyn, admin-sidan, suggestions-sidan) – utan `NEXT_PUBLIC_`-prefix bakas env-variabeln aldrig in i klientbundeln, så de faller fortfarande tillbaka på samma hårdkodade default som förut (ofarligt, eftersom den riktiga spärren alltid varit server-side). Fixen är fullt verksam för den fjärde platsen, en server-route (`api/suggestions/[id]/route.ts`). Om ni vill att en framtida env-rotation ska slå igenom även i klient-UI:t krävs en separat `NEXT_PUBLIC_ADMIN_EMAIL` – inte gjort, egen liten uppgift om ni vill ha den.

**Juridik/GDPR (COPPA-deadline redan passerad, se `APP_STORE_READINESS.md` §5):**
- [x] **Privacy Policy publicerad 2026-09-29** på `/privacy` (version 2026-09-29), länkad från registrering, Settings och ☰-menyn. Personuppgiftsansvarig = Mikael Berglund tills bolaget finns; kontakt = `ADMIN_EMAIL`. Se `GDPR.md`.
- [ ] Byt till bolaget som personuppgiftsansvarig på `/privacy` när det är registrerat (lanseringslistan rad 9–11) och höj `CONSENT_VERSION`.
- [ ] Godkänn biträdesavtal (DPA) hos Supabase, Vercel och Resend och spara kopiorna (`GDPR.md` §5).
- [ ] Kontrollera Supabase backup-tid och skriv in den i `/privacy` §5 och `GDPR.md`.
- [ ] Juristläsning av `/privacy` före bred lansering.
- [x] **Vårdnadshavarens bekräftelse för barn** (2026-09-29): kryssruta när barn läggs till, sparas i `parental_consents`; "Confirm as guardian" för befintliga barn. Barnversion av integritetstexten i My week.
- [x] **Data i EU** (2026-09-29): Vercel-funktioner i `fra1`; Clearbit-anrop borttagna; Googles tokens sparas inte.
- [x] **Export och radering kompletta** (2026-09-29): exporten har läxor/sysslor/aktiviteter/bild; bilder rensas med kontot/familjen.
- [x] Registerförteckning och incidentrutin skrivna – `GDPR.md` §2 och §6.
- [x] *Tillägg 2026-09-29:* registreringssidan säger nu att man måste vara 13 för att skapa ett **eget** konto (yngre läggs till av förälder). Påverkar inte beslutet nedan om barnprofiler – ta bort raden i `register/page.tsx` om du inte vill ha den.
- [x] **Beslutat 2026-08-02:** ingen fast åldersgräns för barnprofiler – bara föräldrasamtycke (skapande föräldern samtycker vid skapandet). Mikael valde bort förslaget om en 13-årsgräns. **Medveten avvägning, inte ett misstag:** svagare COPPA-efterlevnadsposition om appen någonsin distribueras i USA (COPPA:s skärpta 2026-regler kopplar särskilt an till en tydlig åldersgräns) – värt att ha med sig om/när ni tar det beslutet igen inför en amerikansk lansering. Ska in i Privacy Policy-texten när den skrivs.
- [x] Självbetjänings-radering – **kodat 2026-09-27** som mjuk radering: familjeadmin godkänner (admin själv/ensam = bara "Är du säker?"), personen döljs ur familjen, kan återställas av Mikael i `/admin` → Deleted i 60 dagar, rensas sedan automatiskt av cron. Se `TODO.md` punkt 31. Klicktest kvar.

**Löst 2026-08-02 – motsägelse mellan marknadsföring och kod (`PRODUCT_SPEC.md` §7.2):**
- [x] `/features` lovade gratis "household sharing", men koden krävde `is_pro` för att bjuda in hushållsmedlemmar, dela en reminder inom hushållet, och överlämna (handover) en reminder. **Mikael godkände rekommendationen: alla tre är nu gratis** – `api/household/invite`, `api/reminders` (POST+PATCH), `api/reminders/[id]/handover`. Pro-gränsen ligger nu bara vid de faktiska familjefunktionerna (inköpslista, önskelista, sysslor, m.fl. – oförändrat). `tsc --noEmit` kört rent. **Ingen schemaändring**, bara borttagen kod – redo för `git push`.

**Kontosammanslagning (mindre akut, men enkelt):**
- [ ] Bekräftelseskärm innan Google/lösenord-kontosammanslagning sker automatiskt (händer idag tyst). *Notera 2026-09-27: Google-inloggning på ett befintligt konto räknas nu även som e-postverifiering (punkt 31) – sammanslagningen är fortfarande tyst.*

**Nytt fynd 2026-08-02 – onboarding-genomgång (`PRODUCT_SPEC.md` 4b.32):**
- [ ] *Delvis 2026-09-29:* inbjudna personer (barn och vuxna) slipper redan gaten. Kvar: självregistrerade.
- [ ] **Stäng av eller ersätt admin-godkännande-gaten innan bred lansering.** Varje nytt konto är idag blockerat från att logga in alls tills en människa manuellt godkänt det i `/admin` – rätt för nuvarande stängda testfas (bekräftat av Mikael, inga externa användare än), men bryter helt mot "visa värde innan vi ber om något" (§9) och mot vad en ny användare/app store-granskare förväntar sig. Fanns inte som egen punkt i den ursprungliga versionen av den här listan – ett genuint gap, tillagt nu.

---

**Ny blockerare 2026-09-27 (följd av e-postverifieringen):**
- [ ] **Verifiera egen avsändardomän i Resend + sätt `RESEND_FROM_EMAIL`.** Med `onboarding@resend.dev` levererar Resend bara till kontoägarens egen adress – verifierings- och inbjudningsmail till nya användare/barn kommer inte fram, och de kan då inte logga in. Var tidigare en Fas F-punkt, nu blockerande.

---

- [x] **Svenska i appen** (marknadsundersökningen 4 okt: engelska only var största hindret) – live 2026-10-04, `RELEASE_2026-10-04b.md`.
- [ ] Jurist läser svenska integritetstexten (`app/src/app/privacy/PrivacySv.tsx`).

## Fas B – Betalning (innan riktiga pengar tas emot)

**Redan klart (2026-09-28):** 14 dagars provperiod för hela familjen, `/upgrade`, "I want Pro"-förfrågan, admin ger Pro i N dagar, databasfält för Stripe (`proUntil`, `plan`, `proSource`, `stripeCustomerId`, `stripeSubscriptionId`), all behörighetslogik i `lib/entitlements.ts`. Egen reklam för gratis-vuxna + förberett "reklamfritt" (`adFreeUntil`).

- [ ] **Beslut krävs INNAN Stripe kodas:** betalmetod för en framtida iOS-app. Inom EU (primärmarknad) kan Apples "External Purchase Link Entitlement" tillåta Stripe direkt; utanför EU krävs Apples egen In-App Purchase (15–30% avgift). Se `APP_STORE_READINESS.md` §4.
- [ ] Bygg riktig Stripe-integration – ersätter "I want Pro"-förfrågan + admin "Grant Pro". Webhook sätter `proUntil`/`plan`/`proSource="stripe"` (fälten finns redan).
- [ ] Beslut: sälja "reklamfritt" separat, billigare än Pro? (tekniken finns: `adFreeUntil`)
- [ ] Mail före provperiodens slut (t.ex. 3 dagar kvar) – saknas.
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
- [ ] ~~Verifierad egen avsändardomän för email~~ → flyttad till Fas A 2026-09-27 (krävs nu för e-postverifiering).
- [ ] Formell migrations-historik (`prisma migrate` istället för `db push`).
- [ ] Backup-schema utöver Supabase standard.

---

## Fas G – Samlad QA-runda innan lansering

**Lägg även till (2026-09-27):** punkt 30b (tilldelning till alla medlemmar, önskelista för vuxna, kalendertitlar, katalog) och punkt 31 (verifiering, barninbjudan, radering/återställning, läxor & prov) – se `TEST_VERIFICATION.md` §6–7.

Stor mängd funktioner är byggda men aldrig klicktestade skarpt (utspritt över `TODO.md` punkt 7/10/11/12/13/18/20). Istället för att lista varje enskild funktion separat: kör **en enda sammanhängande QA-runda** genom hela appen innan lansering, med särskilt fokus på: School/Training/kalendersynk, anpassningsbar bottenmeny, streckkodsskanning + butiksläge, admin-godkännande end-to-end, och allt i Fas A ovan.

---

## Kodändringar 2026-08-18 (commit `35fb226`) – DEPLOYAD ✅

Familjebegränsningar + inköpslista/kalender-UI, se `TODO.md` punkt 30b. Live via `c1d2f92` (READY). Klicktest kvar.

---

## Kodändringar gjorda 2026-08-02 – DEPLOYAD 2026-08-18 ✅

**Omgång 1 (säkerhet + gratis hushållsdelning):** fem filer ändrade, en ny fil (`lib/rateLimit.ts`).

**Omgång 2 (Training → Activity):** elva filer ändrade, ren text-/emoji-/mallbyte, ingen logikändring.

Ingen schemaändring i någon av omgångarna – ingen `db push`/`prisma generate` krävdes. `tsc --noEmit` kört rent (exit 0) efter varje ändring.

**Status: live.** Commit `29bf8e9` ("security: rate limiting, timing-safe cron secret, consistent ADMIN_EMAIL, free household sharing; rename Training to Activity in UI") pushad till `master` 2026-08-18 och bekräftat deployad till produktion på Vercel (deployment `dpl_3qWTb64whz1ZuTNefwK3TXnUuxUx`, state READY).

- [ ] **Klicktesta i den skarpa appen** (inte gjort ännu): 5 felaktiga lösenords-/PIN-försök i rad ska låsa kontot i 15 minuter (testa på ett testkonto, inte ditt eget – låsningen är på riktigt); bjud in en medlem till ett hushåll som INTE är Pro och bekräfta att det fungerar nu; dela en reminder (visibility → Household) i ett icke-Pro-hushåll och bekräfta att den faktiskt syns för de andra; öppna Activities-sidan/menyn/kalendern och kolla att inget "Training"/⚽ syns kvar.

---

## Kodändringar 2026-09-27 + 2026-09-28 – DEPLOYADE 2026-09-28 ✅

PIN borttaget + e-postverifiering, mjuk radering med 60 dagars återställning, läxor & prov (typ, ämne, avbockning, överst för barnet, visa i kalender, påminnelse dagen före). Se `TODO.md` punkt 31 för filer och körordning.

- [x] Databasändringar – gjorda via tillfällig tokenskyddad migreringsväg (motsvarar `db push`), borttagen efteråt
- [x] PIN-migreringen (samma SQL som `scripts/migrate-2026-09-retire-pin.js`): 3 vuxna verifierade, 1 barn behöver inbjudan
- [x] Resend: DNS för assistiq.se (DKIM, SPF, MX på send.) finns på plats
- [x] Commit + push via VS Code, kolla Vercel READY
- [ ] Skicka nya inbjudningar till barnkonton (Profile → Child accounts → Resend invite)
- [ ] Klicktesta: registrera → mail → bekräfta → logga in; skapa barn → mail → välj lösenord; radera som medlem (begäran) och som admin; återställ i `/admin`; lägg till läxa/prov, bocka av, dölj i kalender

---

## Kodändringar 2026-09-28 kväll + 2026-09-29 – DEPLOYADE ✅

- `5313ef6` – mobiltestets fynd rad 36–48 (butiksläge, radera lista, startsida per roll, prov/läxor på Home, bilder, kalender, sysslor/aktiviteter för alla, Family members, dagväljare, flera personer, datumfält, ☰-menyn). `RELEASE_2026-09-28b.md`.
- `59d4e40` – barn med eget konto/Google kan gå med i familjen; inbjudna slipper admin-godkännande. `RELEASE_2026-09-28b.md` (tillägg).
- GDPR-releasen 2026-09-29 – `RELEASE_2026-09-29.md`.
- Nya tabeller `media_images` och `parental_consents` skapas automatiskt av appen – ingen `db push` behövdes.
- [ ] Klicktesta: `TEST_VERIFICATION.md` §9–§11.

---

## Kodändringar 2026-10-01 – 2026-10-03 – DEPLOYADE ✅

- `7d00537` – barnets startsida som översikt, ta bort familjemedlemmar, samma bild överallt. `RELEASE_2026-10-01.md`.
- `a7b278d` – Home alltid först i menyn nere, Calendar valbar.
- `5e4aef3` – vuxnas Home visar bara barnens närmaste prov.
- SchoolSoft-import per barn – `RELEASE_2026-10-03.md`. Nya tabeller `school_feeds`, `school_imports` skapas automatiskt.
- Admin "View as" (impersonation) i egen familj – `RELEASE_2026-10-03.md` §4.
- [ ] Klicktesta: `TEST_VERIFICATION.md` §12 (inkl. riktig SchoolSoft-länk och View as).

## Kodändringar 2026-10-04 – DEPLOYADE ✅

- `705e72e` – Coming up-kort går att öppna, nästa datum överallt, cron per förekomst, barnens bottenmeny, tomma Home-sektioner döljs.
- `db1214f` – Free/Pro + pris i `lib/plans.ts`, ny `/features`, Log in på startsidan, All reminders 5 + "See all".
- `0930cf3` – poster utan person i familjen syns och kan tas bort; × på sysslor.
- [ ] Mikael tar bort testposterna (Bandy, Empty the dishwasher, Hhdd).
- [ ] Klicktesta: `TEST_VERIFICATION.md` §13.

## Vad som redan är klart och inte behöver oroa er (för sammanhanget)

Bara som påminnelse så ingen råkar lägga tid på att "fixa" något som redan fungerar: bcrypt-hashning, NextAuth-sessions, korrekt hemlighetshantering, konsekventa ägarskapskontroller (IDOR), adminpanelens åtkomstspärr, ogissbara/roterbara delningstokens, barn-dataskyddet i önskelistan, PWA-grunden (manifest+service worker), och **Pro-provperioden** (14 dagar sedan 2026-09-28, se Fas B).
