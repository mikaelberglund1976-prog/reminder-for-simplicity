# Operations – Reminder for Simplicity
**Skapad:** 2026-07-27, enligt `CLAUDE_COMPANY_FRAMEWORK.md`s föreslagna projektstruktur.
**Uppdaterad:** 2026-10-25 (kväll) – masterbriefens etapp 1–7 (`RELEASE_2026-10-25d.md`): Kalendrar & integrationer-sidan (§1), notismätning (§3d), nya tabeller och flaggan `FEATURE_WISHLIST_LINK` (§4, §5a), tillgänglighet och färgvariabler (§7c), offline-kön på inköpslistan (§7c), WhatsApp-utredningen (`WHATSAPP_PLAN.md`).
**Uppdaterad (förmiddag):** 2026-10-25 – Etapp 0 ur masterbriefen (`ASSISTIQ_MASTERBRIEF.md`): grundregeln om befintlig data (§5b), kolumner och enum-värden som appen lägger till själv (§5c), nyckeltalen i admin (§3d), språk per person (§7b), synkhälsa och gemensam källmodell (§1). Se `RELEASE_2026-10-25.md` och `RELEASE_2026-10-25c.md`.
**Uppdaterad tidigare:** 2026-10-23 – kvällskörningen, alla tabeller som skapar sig själva, nya miljövariabler (`ANTHROPIC_API_KEY`, `VAPID_*`, `REQUIRE_SIGNUP_APPROVAL`, `FEATURE_CUSTODY`) och hur Claude pushar nu.
**Syfte:** Hur den löpande driften faktiskt fungerar i den här kodbasen – vad som körs automatiskt, vad som kräver manuell koll, och vad Claude kan göra åt saken när något går fel.

---

## 1. Daglig drift – vad körs automatiskt

**Cron: skicka påminnelser**
- `vercel.json` schemalägger `GET /api/cron/send-reminders` till **08:00 UTC varje dag** (Vercel Cron).
- Endpointen kräver `Authorization: Bearer ${CRON_SECRET}` – Vercel skickar detta automatiskt för schemalagda cron-jobb.
- Logiken bor i `app/src/lib/cron.ts` (`runReminderCron`):
  1. Hämtar alla `isActive: true` reminders
  1b. *(2026-10-04)* Återkommande påminnelser (inte sysslor/aktiviteter/skola) vars datum passerat flyttas fram till nästa förekomst. Loggrad "[namn] rolled forward ÅÅÅÅ-MM-DD -> ÅÅÅÅ-MM-DD"
  2. Räknar ut sändningsdatum som `date - reminderDaysBefore`. *(2026-10-04)* För återkommande påminnelser: skickar om dagen `reminderDaysBefore` framåt är en förekomst (`occursOn`), och mailet visar förekomstens datum
  3. Skickar bara om sändningsdatum = idag OCH ingen `ReminderLog` redan finns för idag (idempotens)
  4. Skickar email via Resend (`sendReminderEmail` i `app/src/lib/email.ts`)
  5. Skriver en `ReminderLog`-rad + uppdaterar `lastSentAt`
  6. Sysslor/aktiviteter/skola som är återkommande: flyttar datumet en period fram efter mailet (som förut). *(2026-10-04)* Vanliga påminnelser flyttas inte längre direkt efter mailet – det gör steg 1b när datumet passerat
  7. Rensar konton som varit mjukt raderade i mer än 60 dagar (inkl. profilbilden)
  0. *(2026-10-03, körs först)* Hämtar SchoolSoft-länkar som inte synkats senaste ~20 h (`syncAllFeeds` i `lib/schoolFeeds.ts`). Loggrad "SchoolSoft feeds: X synced, Y failed"; "SchoolSoft sync ERROR" ska inte förekomma. Fel per barn syns också för föräldern på School-sidan. Endpointen har `maxDuration = 60`.
  8. *(2026-09-29, GDPR)* Tar bort bilder vars person/familj inte finns kvar (`purgeOrphanMedia`) och nollställer sparade Google-tokens
- Returnerar `{ sent, skipped, errors, log }` – synligt i Vercels function-loggar. Rader som börjar med "GDPR cleanup ERROR" eller "Account purge ERROR" ska inte förekomma.

**Morgonkörningen gör också (sedan 7–22 okt):** synkar klubb-/aktivitetskalendrar (`syncAllActivityFeeds`), skickar ändringsvaktens push (`notifyChanges`), resornas påminnelser (pass, vaccin, incheckning, packning – `runTripNudges`) och födelsedagarnas påminnelser och push på dagen (`lib/birthdayCron.ts`).

**Cron: kvällskörning (sedan 2026-10-09)**
- `vercel.json` schemalägger `GET /api/cron/evening` till **17:00 UTC** (19:00 svensk sommartid, 18:00 vintertid). Samma `CRON_SECRET`-skydd.
- Synkar skol- och klubbkalendrar som inte synkats senaste 6 h och skickar ändringsvaktens push, så att en match som flyttats under dagen fångas samma kväll.
- Skickar kvällsnotisen "I morgon" (`lib/tomorrowDigest.ts`): krockvarningar, skolstart ("🏫 Elsa 08:20 · Leo ledig"), prov, läxor, aktiviteter och födelsedagar. Rensar gamla "Ska med"/skjuts-rader och skolstartsundantag äldre än 7 dagar.
- Loggrader "Evening sync ERROR" ska inte förekomma.

**Kalenderlänkar – synkhälsa och källmodell (sedan 2026-10-25)**
- Alla skol- och klubblänkar läses genom `lib/feedSources.ts` (`listSources`) och synkas av samma slinga (`runDueSyncs`) på morgonen och kvällen.
- **Inställningar → Kalendrar & integrationer** (`/dashboard/sources`, sedan 25 okt kväll): alla länkar i en lista med senaste synk, fel i klartext, antal poster och *Synka nu*. Första stället att titta vid support ("SchoolSoft kommer inte in").
- Skollänkar från **vilken plattform som helst** (Unikum, Vklass, InfoMentor, skolans egen kalender) sparas med `provider = 'ical'` och hämtas genom samma SSRF-skyddade hämtning som klubbkalendrar (`fetchPublicCalendar` i `lib/activityFeeds.ts`). SchoolSoft och Studybee hämtas som förut.
- En länk som misslyckats, eller inte synkat på 48 h, syns för familjens vuxna i **Behöver din uppmärksamhet** på Hem ("SchoolSoft för Tyra har inte synkat sedan …", `/api/family/feed-health`). Mikael behöver alltså inte bevaka det själv – men samma lista är första stället att titta när en familj säger att något inte kommit in.
- Engångspåminnelser som bockats av (`completedAt`) mejlas inte (`cron.ts`).

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

### 3c. View as (impersonation, 2026-10-03)
Admin kan se appen som en person i sin egen familj: Family members → "👁 View as". Röd list högst upp med Switch/Back to me; slutar själv efter 2 h. Loggas som `[impersonation] start/stop` i Vercels funktionsloggar. Logik: `app/src/lib/impersonation.ts`. *(25 okt: medan admin "visar som" någon räknas det inte som att den personen öppnat appen i nyckeltalen.)*

### 3d. Nyckeltal (sedan 2026-10-25, Etapp 0 G7)
`/admin/metrics` (länk "Nyckeltal →" i `/admin`, API `/api/admin/metrics`) visar masterbriefens mått (§38–39). Bara antal, ingen familj eller person visas. Definitioner:
- **Samordnade hushåll (7 d) ★** – North Star, första versionen: hushåll där minst 2 olika personer öppnat appen de senaste 7 dagarna.
- **Aktiva hushåll (7 d)** – hushåll med minst ett `app_open` på 7 dagar.
- **Kvarhållning D7 / D30** – av hushållen som först sågs för 7–14 resp. 30–60 dagar sedan: andelen som varit aktiva de senaste 7 dagarna.
- **Kopplad källa** – hushåll med minst en skol- eller klubblänk delat med alla hushåll. **Andra vuxen** – hushåll med ≥2 vuxna. **Barn aktiva** – hushåll med barn där ett barn öppnat appen på 30 dagar.
- **Automatiskt inhämtat (30 d)** – poster från länkar delat med (dem + poster gjorda för hand). **Rättade importer (30 d)** – `import_corrected` (flyttad, ändrad, borttagen) delat med nya importerade. **Lyckade synkar (30 d)**.
- Händelser sparas i `analytics_events` med **pseudonymer** (`hh`/`ph` = HMAC-SHA256 av hushålls-/person-id med `NEXTAUTH_SECRET`, 16 tecken). **Byts `NEXTAUTH_SECRET` bryts kedjan**: hushåll räknas då som nya och kvarhållningen nollställs. Händelser rensas efter 180 dagar av morgonkörningen. Alla händelser listas i `lib/analyticsStore.ts` (`ANALYTICS_EVENTS` från klienten, `SERVER_EVENTS` från servern).
- Data finns från 25 okt 2026. D7 kan visa något tidigast 1 nov och D30 tidigast 24 nov.
- **Öppnade notiser (30 d)** (sedan 25 okt kväll): `notification_opened` (service workern skickar när någon trycker på en notis) delat med `notification_sent` (en per push som nått minst en enhet). `notify_preset_chosen` visar vilka förval (Viktigt/Balanserat/Allt) som används.

## 4. Miljöer & secrets

| Miljö | Var | Kommentar |
|---|---|---|
| Lokal utveckling | `app/.env.local` | Se `SETUP_GUIDE.md`. Innehåller riktiga Supabase/Resend-nycklar – committa aldrig denna fil. |
| Produktion | Vercel → Project Settings → Environment Variables | Samma nycklar som `.env.local`, satta separat i Vercel |
| Databas | Supabase (PostgreSQL), både pooled (`DATABASE_URL`) och direct (`DIRECT_URL`) connection | Direct krävs av Prisma för `db push`/migrations |
| Email | Resend | DNS för assistiq.se (DKIM, SPF, MX på send.) finns sedan 2026-09-28. Kontrollera att `RESEND_FROM_EMAIL` i Vercel är en adress på assistiq.se – `onboarding@resend.dev` levererar bara till Resend-kontoägaren, och då når verifierings- och inbjudningsmail inte fram. |
| Admin/kontakt | `ADMIN_EMAIL` | Gatar `/admin` och visas som kontaktadress på `/privacy` (sedan 2026-09-29). |
| Webb-push | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Satta i Vercel 2026-10-09. Byts nycklarna måste alla slå på notiser igen. |
| AI (veckobrev, "Skriv vad som helst") | `ANTHROPIC_API_KEY`, valfritt `ANTHROPIC_MODEL` | **Saknas i Vercel (23 okt)** – då är veckobrevsskanningen av och snabbinmatningen klarar bara inköp och enkla påminnelser. Production + Preview, Sensitive. Se `GDPR.md` §5 innan den sätts. |
| Registreringsgate | `REQUIRE_SIGNUP_APPROVAL` | Av som standard sedan 2026-10-09. `true` = nya konton måste godkännas i `/admin` igen. |
| Växelvis boende | `FEATURE_CUSTODY` | Av (saknas). `true` slår på den förberedda funktionen – testa först i Preview, se `CUSTODY_PLAN.md`. |
| Önskelista via länk utan konto | `FEATURE_WISHLIST_LINK` | **Av (saknas), byggd 25 okt.** `true` = vuxna kan skapa en delningslänk per önskelista (`/w/<token>`), släkt reserverar med bara namn. Väntar på Mikaels beslut – 2 aug beslutades att delning kräver konto. Se `RELEASE_2026-10-25d.md` §6 och `GDPR.md` #5. |

Om en nyckel roteras (t.ex. ny Resend-nyckel): uppdatera både `.env.local` och Vercels environment variables, redeploya.

---

## 5. Deploy

> ✅ **Löst 2026-07-27 (natt):** automatisk deploy vid `git push` fungerar igen. Problemet var att Vercels GitHub-integration hade tappat webhooken (visade "ansluten" men triggade inget) – ett känt, återkommande Vercel-fel. Fixat genom en riktig **Disconnect** + ny **Connect Git Repository** i Vercel-dashboarden (Project Settings → Git). Bekräftat: en vanlig `git push` triggade en ny production-deployment automatiskt.

- **Trigger (nuläge, normalfallet):** push till `master` på GitHub *(inte `main` – repots default branch heter `master`)*. Vercel deployar automatiskt via GitHub-integrationen.
- **Hur Claude deployar (sedan oktober 2026):** Claudes molnsession har läs- och pushbehörighet till GitHub-repot. Claude klonar, ändrar, kör `tsc --noEmit` och `next build` i molnet och pushar direkt till `master` (commits med Mikael som författare, så att Vercel bygger dem). Vercel deployar automatiskt; Claude kollar att deployen blir READY via Vercel-kopplingen. *Tidigare (28 sep–början av okt):* patch till projektmappen och **Sync** i VS Code på Macen. I molnet kan Prisma-motorn inte laddas ned – kör `PRISMA_SCHEMA_ENGINE_BINARY=/bin/true PRISMA_QUERY_ENGINE_LIBRARY=<tom fil> npx prisma generate --no-engine` för typerna, och `next build` med `NEXT_FONT_GOOGLE_MOCKED_RESPONSES` och en dummy `RESEND_API_KEY`. **Ändra aldrig `layout.tsx` för att få bygget att gå igenom.** Den 25 okt återställde ett sådant skript filen och tog med sig en riktig ändring. Mocka typsnittet i stället.
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
Nya, rent additiva tabeller skapas av appen vid första användning med `CREATE TABLE IF NOT EXISTS` – ingen `db push` och ingen tillfällig migreringsväg behövs. Alla i dag (2026-10-23):

| Tabell | Vad | Fil | Sedan |
|---|---|---|---|
| `media_images` | Profilbilder, familjefoto, egen bild på Hem (`myheader`) | `lib/media.ts` | 28 sep |
| `parental_consents` | Vårdnadshavarens bekräftelse | `lib/consent.ts` | 29 sep |
| `school_feeds`, `school_imports` | Skollänkar och importerade poster (flera länkar per barn sedan 10 okt: `provider`, `feedId`, unikt `(childId, url)`) | `lib/schoolFeeds.ts` | 3 okt |
| `reminder_times` | Klockslag på poster | `lib/reminderTimes.ts` | 7 okt |
| `activity_feeds`, `activity_imports` | Klubbkalendrar och importerade aktiviteter | `lib/activityFeeds.ts` | 9 okt |
| `user_home_prefs` | Vad var och en vill se på Hem | `lib/homePrefsStore.ts` | 9 okt |
| `push_subscriptions`, `push_prefs` | Webb-push per enhet och notisval | `lib/webPush.ts` | 9 okt |
| `chore_rewards` | Veckopeng per stjärna | `lib/choreStars.ts` | 9 okt |
| `wishlist_guests` | Släkt som önskelistan delats med | `lib/wishlistGuests.ts` | 9 okt |
| `intake_usage` | Antal veckobrevsskanningar per familj och månad | `lib/intake.ts` | 10 okt |
| `birthdays` | Födelsedagar (sidotabell till `Reminder`) | `lib/birthdays.ts` | 10 okt |
| `household_colors` | Familjens egna färger | `lib/familyColorsStore.ts` | 10 okt |
| `shopping_category_seeds` | Att Dryck lagts till en gång per familj | `lib/shoppingCategories.ts` | 11 okt |
| `change_alerts`, `change_seen` | Ändringsvakten | `lib/changeWatch.ts` | 11 okt |
| `day_checks`, `day_rides` | "Ska med" och skjuts i I morgon-kortet (rensas efter 7 dagar) | `lib/tomorrowPlan.ts` | 11 okt |
| `quickadd_usage` | AI-tolkningar i "Skriv vad som helst" per familj och månad | `lib/quickAdd.ts` | 11 okt |
| `trips`, `trip_items`, `person_docs` | Resor, packlista/flyg/idéer, passets utgångsdatum | `lib/trips.ts` | 11 okt |
| `reminder_skips` | Enstaka dagar borttagna ur en serie | `lib/reminderSkips.ts` | 17 okt |
| `school_lessons` | Schemat från skollänkarna (lektioner visas bara som första lektion och i veckoschemat). Vid första anrop tas gamla "Lektion MA"-skolposter bort | `lib/schoolLessons.ts` | 22 okt |
| `email_prefs` | Vilka mejl var och en vill ha. Avregistreringslänken är signerad med `NEXTAUTH_SECRET` | `lib/notifyPrefs.ts` | 22 okt |
| `school_start_settings`, `school_start_rules`, `school_start_overrides` | Skolstart: A/B, väckning, egna tider, sovmorgon/lediga dagar (undantag rensas efter 7 dagar) | `lib/schoolStart.ts` | 23 okt |
| `custody_schedules`, `custody_overrides` | Växelvis boende – skapas bara med `FEATURE_CUSTODY=true` | `lib/custody.ts` | förberett 23 okt |

| `wishlist_links`, `wishlist_link_reservations` | Delningslänk per önskelista + släktens reservationer med namn – skapas bara med `FEATURE_WISHLIST_LINK=true` | `lib/wishlistLinks.ts` | byggt 25 okt (av) |
| `analytics_events` | Produktanalys (Mer-menyn 24–25 okt). Sedan 25 okt även pseudonymerna `hh`/`ph`, se §3d | `lib/analyticsStore.ts` | 24 okt |

Mönstret passar bara nya tabeller. Nya kolumner i befintliga tabeller görs fortfarande enligt 5b – utom de rent additiva i 5c.

### 5b. Databasändringar i produktion (lärdom 2026-09-28)
Varken Claudes molnmiljö eller Cowork-VM:en på Macen når Supabase direkt (port 5432), så `npm run db:push` kan bara köras från din egen terminal. Alternativet som användes 28/9 och fungerade utan avbrott:
1. Deploya en tillfällig route som kör idempotent SQL (`ADD COLUMN IF NOT EXISTS` osv.), skyddad med en engångstoken (bara SHA-256 i koden).
2. Anropa den (status → schema → data) mot `reminder-for-simplicity.vercel.app`.
3. Deploya den nya koden. 4. Ta bort routen i en städcommit.
Håll ändringarna additiva (nya kolumner/tabeller, NOT NULL tas bort, aldrig tvärtom) så att gammal och ny kod fungerar under övergången.

**Grundregel (Mikael, 2026-10-24): de befintliga användarnas data ska vara orörd.** Varje release får bara *lägga till* (tabeller, nullbara kolumner, enum-värden) – inga `DROP`, inga omdöpningar, inga typbyten, ingen backfill av befintliga rader. Behövs en datamigrering är det ett eget beslut, med export först. Nya `ensure…()`-funktioner får bara skapa struktur, inte ändra rader. (Äldre undantag som fortfarande körs: städningen av "Lektion"-poster i `schoolFeeds.ts` och MyClub-titlarna i `activityFeeds.ts` – idempotenta men de skriver i data. Ska inte upprepas.)

### 5c. Kolumner och enum-värden som appen lägger till själv (sedan 2026-10-25)
Samma idé som 5a men för befintliga tabeller – bara `ADD COLUMN IF NOT EXISTS` med null/default, eller `ADD VALUE IF NOT EXISTS`, körs vid första användning:

| Ändring | Vad | Fil | Release |
|---|---|---|---|
| `households.language` | Familjens språk | `lib/i18n/server.ts` | 4 okt |
| `school_imports.personOverride`, `activity_imports.personOverride` | Vem en importerad post flyttats till (null = länkens barn) | `lib/schoolFeeds.ts`, `lib/activityFeeds.ts` | 25 okt (a) |
| `users.language` | Personens eget språk (null = familjens) | `lib/i18n/server.ts` | 25 okt (c) |
| `analytics_events.hh`, `.ph` | Pseudonymer för nyckeltalen | `lib/analyticsStore.ts` | 25 okt (c) |
| enum `HouseholdRole` + `CAREGIVER` | Barnvakt / släkt (begränsad vuxen). Läggs till först när någon bjuds in som det | `lib/roles.ts` | 25 okt (c) |

`reminders.completedAt` fanns redan (skolposter) och används sedan 25 okt även för engångspåminnelser – ingen schemaändring.

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

## 7b. Språk och översättningar (sedan 2026-10-04)

- Alla texter i appen ligger i `app/src/lib/i18n/messages/<språk>/`. Engelska (`en`) är facit; svenska (`sv`) måste ha samma nycklar, annars bygger inte appen (TypeScript). **Ny text i appen = lägg till den i både `en` och `sv`.**
- Felmeddelanden från API:t skrivs på engelska i koden och översätts i webbläsaren via `messages/sv/serverErrors.ts`. Ett nytt felmeddelande som saknas där visas på engelska även för svenska familjer – lägg till det i tabellen.
- Mejl till familjer skrivs på mottagarens familjespråk (`lib/email.ts`, `messages/*/emails.ts`). Admin-mejl till Mikael är på engelska.
- Integritetsmeddelandet finns i två filer (`privacy/PrivacyEn.tsx`, `PrivacySv.tsx`) – ändra båda.
- Familjens språk sparas i `households.language`; kolumnen skapas automatiskt av appen (ingen `db push`). Support: en familj som "fastnat" på fel språk byter själv under Family members → Language (admin), eller så sätts kolumnen direkt i Supabase.
- **Sedan 2026-10-25: språk per person.** `users.language` (null = följ familjen). Var och en väljer under Inställningar → Språk → *Mitt språk*; familjens språk är standard för de som inte valt. Mejl och push går på personens språk (`getLocaleForUser`: person → familj → enhet). Support: "fel språk för en person" → nollställ `users.language` för den personen.
- Nytt språk: se receptet i `RELEASE_2026-10-04b.md`.

## 7c. Tillgänglighet, ikoner och offline (sedan 2026-10-25)

- **Tillgänglighet (masterbrief §37):** sidorna granskas med axe-core (WCAG 2.1 A/AA) i ljust och mörkt läge. Senast 25 okt: noll fel på Hem, Påminnelser, Ny påminnelse, Kalender, Skola, Aktiviteter, Inköpslista, Önskelista, Barnets dag, Inställningar, Kalendrar & integrationer, delad önskelista och Logga in.
  - **Zoom är tillåten.** Lägg aldrig tillbaka `maximumScale`/`userScalable` i `app/layout.tsx`.
  - Fält har 16 px på mobil (`globals.css`), så att iPhone inte zoomar in när man trycker i dem.
  - **Färgvariabler:** text ska ha minst 4,5:1 mot bakgrunden. `--subtle` (#66727C i ljust läge) är den ljusaste tillåtna textfärgen. `--faint` är bara för dekor (chevroner, streck), aldrig för text man ska läsa.
  - Nya fält och knappar utan synlig etikett ska ha `aria-label`.
- **Ikoner (§32):** `components/icons.tsx` (`<Icon name="school" />` …) är appens ikonsystem. Använd den för nya ytor i stället för emoji eller egna SVG:er. Emoji används bara som känslomässig accent i text.
- **Offline på inköpslistan (§35):** avbockningar utan uppkoppling köas i `localStorage` (`rfs:shop-queue`, bara varans id och bockad eller inte) och skickas när nätet är tillbaka. Senaste avbockningen gäller. Sidor cachas fortfarande inte (service workern, beslut 4 okt), så en sida som inte redan är öppen visar `/offline.html`.

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

*Detta dokument beskriver nuläget (2026-10-04: cron rullar fram passerade återkommande påminnelser, se steg 1b; 2026-09-29: region fra1, självskapande tabeller, GDPR-rensning i cron, deploy via VS Code Sync; 2026-09-28: punkt 31 live; 2026-08-02: säkerhetsgranskningen i §8). Uppdatera det när driftrutiner ändras – t.ex. om ni lägger till Sentry, byter från `db push` till `migrate`, sätter upp en verifierad email-domän, eller åtgärdar fynden i §8.*
