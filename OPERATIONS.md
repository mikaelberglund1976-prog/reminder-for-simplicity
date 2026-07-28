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
- Returnerar `{ sent, skipped, errors, log }` – synligt i Vercels function-loggar.

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

**Åtkomst (uppdaterat 2026-07-27):** tidigare nåddes `/admin` bara genom att skriva URL:en direkt – det fanns ingen länk i appen. Sedan bottenmenyn (Reminders/Shopping list/Wishlist) infördes och tog över `/dashboard`s tidigare inbyggda navigering, lades en hamburgermeny (`components/HamburgerMenu.tsx`) till i sidhuvudet på Reminders/Family/Shopping list/Wishlist-sidorna. Den visar en "Admin"-länk endast om `session.user.email === ADMIN_EMAIL` (samma konstant som skyddar sidan själv, delad via `lib/adminConfig.ts`).

---

## 4. Miljöer & secrets

| Miljö | Var | Kommentar |
|---|---|---|
| Lokal utveckling | `app/.env.local` | Se `SETUP_GUIDE.md`. Innehåller riktiga Supabase/Resend-nycklar – committa aldrig denna fil. |
| Produktion | Vercel → Project Settings → Environment Variables | Samma nycklar som `.env.local`, satta separat i Vercel |
| Databas | Supabase (PostgreSQL), både pooled (`DATABASE_URL`) och direct (`DIRECT_URL`) connection | Direct krävs av Prisma för `db push`/migrations |
| Email | Resend | `RESEND_FROM_EMAIL` är idag `onboarding@resend.dev` (Resends testadress) – byt till en verifierad egen domän innan skarp lansering, annars hamnar mail lättare i skräppost |

Om en nyckel roteras (t.ex. ny Resend-nyckel): uppdatera både `.env.local` och Vercels environment variables, redeploya.

---

## 5. Deploy

> ✅ **Löst 2026-07-27 (natt):** automatisk deploy vid `git push` fungerar igen. Problemet var att Vercels GitHub-integration hade tappat webhooken (visade "ansluten" men triggade inget) – ett känt, återkommande Vercel-fel. Fixat genom en riktig **Disconnect** + ny **Connect Git Repository** i Vercel-dashboarden (Project Settings → Git). Bekräftat: en vanlig `git push` triggade en ny production-deployment automatiskt.

- **Trigger (nuläge, normalfallet):** push till `master` på GitHub *(inte `main` – repots default branch heter `master`)*. Vercel deployar automatiskt via GitHub-integrationen.
- **Trigger (manuell nödlösning, om webhooken skulle tappas igen):** `npx vercel --prod` från `app/`-mappen (kräver `npx vercel login` + `npx vercel link` en gång per dator, kopplat till projektet `reminder-for-simplicity` i teamet `mikaelberglund1976-progs-projects`).
- **Om auto-deploy tystnar igen:** gör om samma Disconnect/Connect-steg i Vercel-dashboarden först – det är den kända fixen för detta specifika Vercel-fel.
- **Build:** `prisma generate && next build` (se `package.json`), oavsett trigger-metod.
- **Databasändringar:** körs INTE automatiskt vid deploy. Efter en schema-ändring: kör `npx prisma db push` manuellt (eller sätt upp en riktig migration-strategi längre fram – idag används `db push`, inte `prisma migrate`, vilket är enklare men ger ingen migrationshistorik)
- **Backfill-scripts (tillagt 2026-07-28):** vissa schemaändringar lämnar gamla fält på plats (deprecated, oanvända av koden) istället för att ta bort dem direkt, just för att kunna köra en enkel additiv `db push` utan risk för dataförlust. Ett separat script flyttar sedan över data till de nya fälten. Körordning efter en `db push`: `node scripts/backfill-shopping-categories.js` (kategorier → `ShoppingCategoryDef`), sedan `node scripts/backfill-lists.js` (inköps-/önskelistor → `List`). Båda är idempotenta (säkra att köra flera gånger) och måste köras lokalt – Cowork-sandboxen som skrev migreringskoden kan varken nå Supabase-databasen (DNS/nätverksblockering) eller ladda ner Prisma-motorn (`binaries.prisma.sh` blockerad), så den kan inte köra dem själv.
- **Rollback:** Vercel → Deployments → "Promote to Production" på en tidigare deploy. Databasändringar rullas INTE tillbaka automatiskt av detta – om en deploy innehöll en destruktiv schemaändring krävs manuell databas-rollback.

---

## 6. Incidenter (lightweight – ingen formell process idag)

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

---

*Detta dokument beskriver nuläget (2026-07-28). Uppdatera det när driftrutiner ändras – t.ex. om ni lägger till Sentry, byter från `db push` till `migrate`, eller sätter upp en verifierad email-domän.*
