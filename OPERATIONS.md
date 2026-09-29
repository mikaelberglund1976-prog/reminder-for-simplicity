# Operations – Reminder for Simplicity
**Skapad:** 2026-07-27, enligt `CLAUDE_COMPANY_FRAMEWORK.md`s föreslagna projektstruktur.
**Syfte:** Hur den löpande driften faktiskt fungerar i den här kodbasen – vad som körs automatiskt, vad som kräver manuell koll, och vad Claude kan göra åt saken när något går fel.

---

## 1. Daglig drift – vad körs automatiskt

**Cron: skicka påminnelser**
- `vercel.json` schemalägger `GET /api/cron/send-reminders` till **08:00 UTC varje dag** (Vercel Cron).
- Endpointen kräver `Authorization: Bearer ${CRON_SECRET}` – Vercel skickar detta automatiskt för schemalagda cron-jobb.
- Logiken bor i `app/src/lib/cron.ts` (`runReminderCron`):
  1. Hämtar alla `isActive: true` reminders
  2. Räknar ut sändningsdatum som `date - reminderDaysBefore`
  3. Skickar bara om sändningsdatum = idag OCH ingen `ReminderLog` redan finns för idag (idempotens)
  4. Skickar email via Resend (`sendReminderEmail` i `app/src/lib/email.ts`)
  5. Skriver en `ReminderLog`-rad + uppdaterar `lastSentAt`
  6. Om reminder är återkommande (DAILY/WEEKLY/MONTHLY/YEARLY): räknar ut och sparar nästa datum
  7. Rensar konton som varit mjukt raderade i mer än 60 dagar (inkl. profilbilden)
  8. *(2026-09-29, GDPR)* Tar bort bilder vars person/familj inte finns kvar (`purgeOrphanMedia`) och nollställer sparade Google-tokens
- Returnerar `{ sent, skipped, errors, log }` – synligt i Vercels function-loggar. Rader som börjar med "GDPR cleanup ERROR" eller "Account purge ERROR" ska inte förekomma.

**Region (2026-09-29):** `app/vercel.json` har `"regions": ["fra1"]` – serverfunktionerna körs i Frankfurt, samma region som Supabase (eu-central-1). Personuppgifter lämnar inte EU vid vanliga sidladdningar, och databasanropen blir snabbare.

**Manuell körning (för felsökning eller om cron missades)**
- `/admin` → adminpanelen har en knapp som anropar `POST /api/admin/trigger-cron`
- Kräver inloggad session där `session.user.email === ADMIN_EMAIL`
- Kör exakt samma `runReminderCron()`-funktion, returnerar samma logg direkt i UI:t

**Testa att email fungerar**
- `/api/admin/test-email` (adminpanelen) – skickar ett enstaka test-mail via Resend utan att röra reminder-data

---

## 2. Vad Mikael behöver kolla manuellt (ingen automatik idag)

| Vad | Var | Hur ofta |
|---|---|---|
| Att cron faktiskt kört | Vercel → Project → Cron Jobs → körningshistorik | Efter varje deploy, sedan sporadiskt |
| Att mail inte hamnar i skräppost | Resend dashboard → Deliverability/Logs | Vid nya beta-användare |
| Nya registreringar / hushåll | `/admin` | Veckovis under beta |
| Databasens storlek/kvot | Supabase dashboard → Usage | Månadsvis (gratis-tier har tak) |
| Vercel-kvot (function-anrop, bandbredd) | Vercel dashboard → Usage | Månadsvis |

Det finns **ingen automatisk monitoring/alerting** idag (t.ex. Sentry, uptime-check). Om cron tyst slutar fungera märks det bara genom att användare hör av sig om uteblivna mail, eller genom att någon aktivt kollar Vercel-loggarna ovan.

---

## 3. Admin-panelen (`/admin`)

Skyddad av `ADMIN_EMAIL` (miljövariabel, satt till Mikaels email). Adminpanelen kan:
- Lista/söka användare och hushåll
- Lägga till/ta bort medlemmar i ett hushåll manuellt
- Slå på/av `is_pro` per hushåll (dagens enda "betalflöde" – helt manuellt, se `ROADMAP.md`)
- Trigga cron manuellt, skicka test-email
- Se familjer/barnprofiler per hushåll (`/admin/families/[id]`)

Det finns ingen roll-nivå inom admin – man antingen är `ADMIN_EMAIL` eller inte.

**Åtkomst (uppdaterat 2026-07-28):** tidigare nåddes `/admin` bara genom att skriva URL:en direkt – det fanns ingen länk i appen. Sedan bottenmenyn infördes och tog över `/dashboard`s tidigare inbyggda navigering, lades en hamburgermeny (`components/HamburgerMenu.tsx`) till i sidhuvudet. Den visar nu länkar till alla sidor i appen (Reminders, Calendar, Shopping list, Wishlist, Chores, Training, School, Ideas & voting, Settings), oavsett vilka appar som är valda i den anpassningsbara bottenmenyn (se `PRODUCT_SPEC.md` 4b.10/4b.11) – en "Admin"-länk visas längst ner endast om `session.user.email === ADMIN_EMAIL` (samma konstant som skyddar sidan själv, delad via `lib/adminConfig.ts`).

---

### 3b. Planer och reklam i admin (2026-09-28)
- **Pro-förfrågningar:** "Free · wants Pro" syns i familjelistan i `/admin`, och du får ett mail. Öppna familjen → **Grant Pro** +14/30/90/365 dagar, *Custom…* (valfritt antal), *Forever* eller *Remove Pro*. Förlängning läggs på nuvarande slutdatum. Familjens ägare får ett mail.
- **Reklamfritt utan Pro:** samma sida → *Ad-free* +30/365 dagar.
- **Annonser:** `/admin/ads` (länk "Ads →" i `/admin`). Skapa/ändra/pausa/radera; se visningar, klick och CTR. Bara http(s)-länkar godkänns. Klick går via `/api/ads/[id]/click` som räknar och skickar vidare.
- **Radering:** `/admin` → Deleted: Restore eller Delete now. Automatisk permanent radering efter 60 dagar sker i cron.

## 4. Miljöer & secrets

| Miljö | Var | Kommentar |
|---|---|---|
| Lokal utveckling | `app/.env.local` | Se `SETUP_GUIDE.md`. Innehåller riktiga Supabase/Resend-nycklar – committa aldrig denna fil. |
| Produktion | Vercel → Project Settings → Environment Variables | Samma nycklar som `.env.local`, satta separat i Vercel |
| Databas | Supabase (PostgreSQL), både pooled (`DATABASE_URL`) och direct (`DIRECT_URL`) connection | Direct krävs av Prisma för `db push`/migrations |
| Email | Resend | DNS för assistiq.se (DKIM, SPF, MX på send.) finns sedan 2026-09-28. Kontrollera att `RESEND_FROM_EMAIL` i Vercel är en adress på assistiq.se – `onboarding@resend.dev` levererar bara till Resend-kontoägaren, och då når verifierings- och inbjudningsmail inte fram. |
| Admin/kontakt | `ADMIN_EMAIL` | Gatar `/admin` och visas som kontaktadress på `/privacy` (sedan 2026-09-29). |

Om en nyckel roteras (t.ex. ny Resend-nyckel): uppdatera både `.env.local` och Vercels environment variables, redeploya.

---

## 5. Deploy

> ✅ **Löst 2026-07-27 (natt):** automatisk deploy vid `git push` fungerar igen. Problemet var att Vercels GitHub-integration hade tappat webhooken (visade "ansluten" men triggade inget) – ett känt, återkommande Vercel-fel. Fixat genom en riktig **Disconnect** + ny **Connect Git Repository** i Vercel-dashboarden (Project Settings → Git). Bekräftat: en vanlig `git push` triggade en ny production-deployment automatiskt.

- **Trigger (nuläge, normalfallet):** push till `master` på GitHub *(inte `main` – repots default branch heter `master`)*. Vercel deployar automatiskt via GitHub-integrationen.
- **Hur Claude deployar (sedan 2026-09-28):** Claudes molnmiljö har ingen GitHub-behörighet och Cowork-VM:en på Macen har inga git-uppgifter. Claude gör ändringarna i en molnkopia, testar och bygger där, lägger över en patch till projektmappen, committar i VM:en och klickar sedan **Sync** i VS Code på Macen (klick-behörighet via datoranvändning) – det är Macens git som pushar. Git i VM:en behöver radera-behörighet för sina låsfiler (`.git/*.lock`) under sessionen; ofarliga `tmp_obj_*`-filer kan bli kvar i `.git/objects`.
- **Trigger (manuell nödlösning, om webhooken skulle tappas igen):** `npx vercel --prod` från `app/`-mappen (kräver `npx vercel login` + `npx vercel link` en gång per dator, kopplat till projektet `reminder-for-simplicity` i teamet `mikaelberglund1976-progs-projects`).
- **Om auto-deploy tystnar igen:** gör om samma Disconnect/Connect-steg i Vercel-dashboarden först – det är den kända fixen för detta specifika Vercel-fel.
- **Build:** `prisma generate && next build` (se `package.json`), oavsett trigger-metod.
- **Känd fälla: `tsc --noEmit` räcker inte för att lita på en grön deploy.** Två gånger nu (2026-07-28, se `TODO.md` punkt 13 och punkt 21) har kod som passerade `tsc --noEmit` rent ändå failat i Vercels `next build` – typkontroll fångar inte allt `next build`s prerender-steg kräver. Konkret exempel: en klient-komponent som anropar `useSearchParams()` utan att sitta i en `<Suspense>`-gräns är typkorrekt men kraschar prerenderingen av just den sidan. Efter varje push: kolla faktiskt Vercel-dashboarden för grönt, lita inte på att `tsc` var tyst.
- **Databasändringar:** körs INTE automatiskt vid deploy. Efter en schema-ändring: kör `npx prisma db push` manuellt (eller sätt upp en riktig migration-strategi längre fram – idag används `db push`, inte `prisma migrate`, vilket är enklare men ger ingen migrationshistorik)
- **Backfill-scripts (tillagt 2026-07-28):** vissa schemaändringar lämnar gamla fält på plats (deprecated, oanvända av koden) istället för att ta bort dem direkt, just för att kunna köra en enkel additiv `db push` utan risk för dataförlust. Ett separat script flyttar sedan över data till de nya fälten. Körordning efter en `db push`: `node scripts/backfill-shopping-categories.js` (kategorier → `ShoppingCategoryDef`), sedan `node scripts/backfill-lists.js` (inköps-/önskelistor → `List`). Båda är idempotenta (säkra att köra flera gånger) och måste köras lokalt – Cowork-sandboxen som skrev migreringskoden kan varken nå Supabase-databasen (DNS/nätverksblockering) eller ladda ner Prisma-motorn (`binaries.prisma.sh` blockerad), så den kan inte köra dem själv.
- **Migreringsscript 2026-09-27:** efter `db push` för punkt 31 – kör `node scripts/migrate-2026-09-retire-pin.js` (från `app/`). Markerar befintliga vuxna som e-postverifierade (så ingen låses ute), rensar all PIN, nollställer barnens PIN-lösenord och listar barn som behöver ny inbjudan. Idempotent.
- **Schemalagt jobb (cron, 08:00 UTC):** skickar påminnelser och – sedan 2026-09-27 – rensar konton som varit mjukt raderade i mer än 60 dagar (`lib/accountDeletion.ts` → `purgeExpiredAccounts`). Delade listor/varor/påminnelser flyttas först till en kvarvarande familjemedlem.
- **Återställa ett raderat konto:** `/admin` → fliken **Deleted** → **Restore** (inom 60 dagar). Personen läggs tillbaka i sin familj om den finns kvar, annars får hen ett nytt eget hushåll. **Delete now** raderar permanent direkt.
- **Rollback:** Vercel → Deployments → "Promote to Production" på en tidigare deploy. Databasändringar rullas INTE tillbaka automatiskt av detta – om en deploy innehöll en destruktiv schemaändring krävs manuell databas-rollback.

---

### 5a. Tabeller som skapar sig själva (sedan 2026-09-28)
Nya, rent additiva tabeller skapas av appen vid första användning med `CREATE TABLE IF NOT EXISTS` – ingen `db push` och ingen tillfällig migreringsväg behövs:
- `media_images` (profilbilder och familjefoto) – `app/src/lib/media.ts`
- `parental_consents` (vårdnadshavarens bekräftelse) – `app/src/lib/consent.ts`
Mönstret passar bara nya tabeller. Nya kolumner i befintliga tabeller görs fortfarande enligt 5b.

### 5b. Databasändringar i produktion (lärdom 2026-09-28)
Varken Claudes molnmiljö eller Cowork-VM:en på Macen når Supabase direkt (port 5432), så `npm run db:push` kan bara köras från din egen terminal. Alternativet som användes 28/9 och fungerade utan avbrott:
1. Deploya en tillfällig route som kör idempotent SQL (`ADD COLUMN IF NOT EXISTS` osv.), skyddad med en engångstoken (bara SHA-256 i koden).
2. Anropa den (status → schema → data) mot `reminder-for-simplicity.vercel.app`.
3. Deploya den nya koden. 4. Ta bort routen i en städcommit.
Håll ändringarna additiva (nya kolumner/tabeller, NOT NULL tas bort, aldrig tvärtom) så att gammal och ny kod fungerar under övergången.

## 6. Incidenter

> **2026-09-29:** en riktig incidentrutin för personuppgiftsincidenter (anmälan till IMY inom 72 h) finns nu i `GDPR.md` §6. Texten nedan gäller tekniska driftproblem.


Om något är trasigt i produktion:
1. Kolla Vercel function-loggar för den drabbade routen (särskilt `/api/cron/send-reminders` för mailproblem)
2. Kolla Supabase → Logs för databasfel
3. Kolla Resend → Logs för leveransproblem
4. Om det är en kodbugg: fixa lokalt, verifiera, pusha till `master` (se §5 – deployar automatiskt)
5. Om det är databas-relaterat: **fråga Mikael innan du kör något destruktivt** (se eskalationsregler i `CLAUDE_COMPANY_FRAMEWORK.md` §8 – betaldata och pivotbeslut kräver alltid hans godkännande, och databas-incidenter bör behandlas med samma försiktighet)

Det finns ingen statussida eller automatiserad kundkommunikation vid driftstörning – med dagens användarantal (pre-beta) hanteras det manuellt via direktkontakt om det behövs.

---

## 7. Vad som saknas för att detta ska vara "riktig" drift

Dessa är kända luckor, inte akuta – men bör tas i tur och ordning i takt med att användarantalet växer (se `ROADMAP.md` Fas 2):
- Ingen error tracking (Sentry eller liknande)
- Ingen uptime-monitoring/alerting
- Ingen verifierad egen avsändardomän för email (leveranssäkerhet)
- Ingen formell migrations-historik (Prisma `db push` istället för `migrate`)
- Inget backup-schema utöver Supabase's standardbackuper
- ~~Ingen rate limiting/lockout på inloggning~~ – **åtgärdat och live i produktion sedan 2026-08-18**, se §8 nedan.

---

## 8. Säkerhetsgranskning av användardata (2026-08-02)

Genomförd på Mikaels begäran ("vi har mycket användaruppgifter, viktigt att ingen kommer åt den") – en konkret kodgenomgång (inte bara dokumentation) av autentisering, auktorisering, adminpanelen, publika token-endpoints, barn-dataskydd, hemlighetshantering och injektion/XSS. Se `PRODUCT_SPEC.md` §10 för hur detta speglas i de icke-funktionella kraven, och punkt 24 i `TODO.md` för handlingslistan.

**Deploy-status (2026-08-18):** samtliga fixar nedan är pushade och bekräftat live i produktion på Vercel (commit `29bf8e9`), inte bara skrivna i koden. Se `TODO.md` punkt 30.

**Kritiskt fynd – ÅTGÄRDAT 2026-08-02:**
- **Ingen rate limiting/lockout på inloggning – varken lösenord eller PIN.** Inget `middleware.ts`, ingen throttling, ingen CAPTCHA. PIN-inloggningen (`auth.ts`, pin-providern) är extra känslig: bara 4 siffror (10 000 kombinationer), och barnprofilers email genereras ofta enligt ett gissbart mönster (t.ex. `förälder+barnnamn@gmail.com`, se `family/child-profiles/route.ts`). Eftersom PIN-inloggning bygger på att känna till email, är kombinationen "gissbar email + obegränsade PIN-försök" den mest konkreta risken i appen idag.
  - **Fix:** `lib/rateLimit.ts` (nytt), kopplat in i båda providrarna i `lib/auth.ts` – 5 misslyckade försök inom 15 minuter låser kontot (delat mellan lösenord/PIN) i 15 minuter. **Kvarstår ändå, medvetet inte löst av detta:** det gissbara email-mönstret för barnprofiler – det är ett produktbeslut, inte en teknisk fix, se `LAUNCH_CHECKLIST.md` Fas A.
  - **Känd begränsning i fixen:** in-memory, per serverless-instans – inte en delad/global spärr mellan Vercels instanser. Höjer kostnaden för att bruteforcea ett känt konto rejält, men är inte vattentätt. Uppgradera till en delad store (Upstash Redis rekommenderas, gratis-tier finns) om detta ska vara en fullständig lösning.

**Uppföljning 2026-09-27 – PIN pensionerad (kodat, ej deployat, `TODO.md` 31):** det kvarstående gissbara-email-problemet löses genom att ta bort PIN helt. Alla konton loggar in med verifierad e-post + lösenord (bcrypt cost 12) eller Google. Verifierings-/inbjudningstokens lagras bara som SHA-256-hash (`lib/verification.ts`). Den publika endpointen `/api/family/children` (listade namn + e-post för ett hushålls-id utan inloggning) är borttagen. JWT-sessioner kontrolleras var 5:e minut mot `deletedAt` så ett raderat konto tappar åtkomst även med en giltig session.

**Viktiga fynd – ÅTGÄRDADE 2026-08-02:**
- `CRON_SECRET`-jämförelsen i `/api/cron/send-reminders/route.ts` använde `!==` (icke-konstant-tid) istället för `crypto.timingSafeEqual`. **Fixat** – konstant-tidsjämförelse med explicit längdkontroll.
- `ADMIN_EMAIL` var hårdkodad i `lib/adminConfig.ts`. **Fixat** – läser nu `process.env.ADMIN_EMAIL ?? "..."`, samma mönster som API-routes. Nyans: tre av fyra importställen är `"use client"`-komponenter, och utan `NEXT_PUBLIC_`-prefix bakas env-variabeln aldrig in i klientbundeln – de fortsätter alltså falla tillbaka på samma hårdkodade default som förut (ofarligt, ren UI-visning). Fixen är fullt verksam för den server-sida route:n som också importerar den.
- Ingen auktorisering på middleware-nivå – varje route sköter sin egen `getServerSession`-kontroll. Idag konsekvent gjort rätt (se nedan), men arkitekturen saknar "försvar på djupet": en enda glömd sessionskontroll i en framtida route skulle exponera data direkt. **Inte åtgärdat** – arkitekturfråga, se `LAUNCH_CHECKLIST.md` Fas A/P2.

**Redan bra löst – värt att veta, inte bara problem:**
- Lösenord: bcrypt, cost factor 12 (registrering), cost 10 (PIN) – i linje med praxis.
- Sessions: NextAuth JWT-strategi, `NEXTAUTH_SECRET` läses från env, inga hemligheter hårdkodade. `.env`/`.env.local` korrekt gitignorade, `.env.example` innehåller bara platshållare, ingen läckt nyckel hittad i källkoden.
- **IDOR/auktorisering:** alla granskade `[id]`-routes (reminders, wishlist, shopping-list, household/members) filtrerar konsekvent på användarens hushåll/ägarskap innan data returneras eller ändras.
- **Adminpanelen:** samtliga granskade `/api/admin/*`-routes kontrollerar `ADMIN_EMAIL` server-side konsekvent; exponerar aldrig lösenordshashar eller PIN.
- **Publika tokens** (`calendarFeedToken`, `List.shareToken`): genereras med `crypto.randomBytes(18)` (~144 bitar, ogissbara), kan roteras/återkallas av användaren själv, läcker inte andra medlemmars privata data.
- **Barn-dataskydd:** wishlist-statusstrippningen för barn är verifierad korrekt i både GET och PATCH, server-side, ingen väg runt den hittad.
- **Injektion/XSS:** ingen rå SQL, all databasåtkomst via Prisma; `dangerouslySetInnerHTML` används bara på en fast kodkonstant, aldrig på användarinmatning.

---

*Detta dokument beskriver nuläget (2026-09-29: region fra1, självskapande tabeller, GDPR-rensning i cron, deploy via VS Code Sync; 2026-09-28: punkt 31 live; 2026-08-02: säkerhetsgranskningen i §8). Uppdatera det när driftrutiner ändras – t.ex. om ni lägger till Sentry, byter från `db push` till `migrate`, sätter upp en verifierad email-domän, eller åtgärdar fynden i §8.*
