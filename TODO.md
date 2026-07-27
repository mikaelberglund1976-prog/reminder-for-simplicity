# Todo – Reminder for Simplicity
**Skapad:** 2026-07-26, efter granskning av kodbas + git-status vid flytt till ny dator.
**Uppdaterad:** 2026-07-27 (kväll) – byggde beställningen "Inköpslista & barnens önskelista" (kategorisering, önskelista, bottenmeny). Slog ihop alla kvarstående klicktest-punkter till en lista längst ner (punkt 5) så du inte behöver leta i flera sektioner.

---

## 1. Städa git – klart
- [x] **Radslut (CRLF/LF):** `.gitattributes` (`* text=auto eol=lf`) tillagd, `git add --renormalize .` kört.
- [x] `tsconfig.tsbuildinfo` avregistrerad från git (`git rm --cached`) och tillagd i `.gitignore`.
- [x] `.DS_Store` tillagd i `.gitignore` (rot).
- [x] `app/next-env.d.ts` tillagd i `app/.gitignore`.
- [x] `app/.gitignore` var UTF-16-kodad och innehöll bara `app/.env` – omskriven i UTF-8 med alla rätt rader.

*Obs: sandboxen jag jobbar i har ovanliga filsystembegränsningar (kan inte `rm`/`unlink` filer utan att be om lov, git lämnar kvar tomma `.git/objects/tmp_obj_*`-filer). Detta är specifikt för min miljö, inte ditt repo – på din dator fungerar `git status`/`git gc` som vanligt.*

## 2. Miljövariabler – klart
- [x] `app/.env.local` var **också** UTF-16-kodad (samma Windows-kopiering) och innehöll bara 3 av 12 nycklar (`DATABASE_URL`, `NEXTAUTH_URL`, `RESEND_API_KEY`) – resten föll tyst bort. Omskriven i UTF-8 med alla nycklar: `DIRECT_URL` återanvänder samma Supabase-URL (den är redan i direct-format), `NEXTAUTH_SECRET`/`CRON_SECRET` slumpgenererade, `ADMIN_EMAIL`/`NEXT_PUBLIC_APP_URL`/`NEXT_PUBLIC_APP_NAME` ifyllda med kända värden. `GOOGLE_CLIENT_ID`/`SECRET` lämnade tomma (kräver ditt Google Cloud-konto – kan inte fejkas).
- [x] `auth.ts` kraschade förut på `!`-assertion om Google-nycklar saknades. Fixat: Google-provider läggs bara till om båda env-variablerna faktiskt är satta, annars körs bara email/lösenord. Samtidigt översatte jag filens Swedish-kommentarer och felmeddelanden till engelska (matchar språkbeslutet).

## 3. Dokumentation – klart
- [x] ROADMAP.md, PRODUCT_SPEC.md, BRAND.md, SETUP_GUIDE.md uppdaterade mot faktisk kodbas-status
- [x] Färgpalett beslutad: `#4A5FD5` (från `RFS-Product-Direction.md`). Genomfört i `globals.css`, `BRAND.md`, alla `.tsx`-filer i `app/src` och `public/manifest.json`.
- [x] **AssistIQ-kvarlevor borttagna** – mycket mer utbrett än ursprungligen upptäckt: fanns i `schema.prisma`, `sw.js`, `manifest.json` (PWA-namn), `layout.tsx` (sidtitel + OpenGraph), alla laddningstexter, header-loggor (register/join-household/admin), `@assistiq.internal`-platshållardomänen för barnprofiler, och **samtliga transaktionsmail i `email.ts`** (ämnesrader, header, footer på reminder-, invite-, handover- och welcome-mail – riktiga mail som annars gått ut till användare med fel produktnamn). Allt bytt till "Reminder for Simplicity".
- [x] `landing-page.html` borttagen – den var på svenska med den gamla färgpaletten och helt frikopplad från `app/src/app/page.tsx` (som redan är den riktiga, engelska landningssidan). `SETUP_GUIDE.md` uppdaterad.
- [x] **Språkbeslut:** Engelska är primärspråk (matchar redan byggd app). `PRODUCT_SPEC.md` uppdaterad. `BRAND.md`s tonexempel-tabell och email-mallar (avsnitt 5) översatta till engelska.
- [x] `OPERATIONS.md` skriven – beskriver cron/admin/email/deploy/incident-rutiner för nuläget.

## 4. Produktluckor – tre av fyra hanterade
- [x] **Glömt lösenord-flöde byggt:** `/forgot-password` + `/reset-password`-sidor, `POST /api/auth/forgot-password` + `/api/auth/reset-password`, nytt `PasswordResetToken`-schema (1 timmes utgång, engångsbruk), mail via `sendPasswordResetEmail`. Länk tillagd på inloggningssidan. `prisma db push` kört – tabellen finns i databasen. Klicktest: se punkt 5.
- [ ] **Stripe/betalflöde** – medvetet inte byggt. Kräver ditt Stripe-konto, API-nycklar och prissättningsbeslut, det kan jag inte ta åt dig. Rekommendation: vänta till Fas 2 (efter beta-validering) enligt roadmapen.
- [ ] **Push-notiser** – medvetet inte byggt. Går tekniskt att göra utan externt konto (web-push + självgenererade VAPID-nycklar), men är ett Fas 2-item i roadmapen – säg till om du vill att jag bygger det nu istället för att vänta.
- [ ] **PWA end-to-end** – kodgranskad (manifest.json + sw.js ser korrekta ut efter AssistIQ-fixen), men riktig test på en telefon kräver en telefon, inte en sandbox. Klicktest: se punkt 5.

## 4b. Delad inköpslista, grundversion (2026-07-27)
- [x] **Byggd:** `ShoppingListItem`-modell, `GET/POST /api/family/shopping-list`, `PATCH/DELETE /api/family/shopping-list/[id]`, ny sida `/dashboard/family/shopping-list`, länkad från `/dashboard/family`. Alla hushållsmedlemmar (även barn) kan lägga till/bocka av/ta bort. Samma Pro/trial-spärr som sysslor. `prisma db push` kört – tabellen finns i databasen.
- Utökad samma dag enligt formell beställning – se punkt 4c nedan. Klicktest: se punkt 5.

## 4c. Ny funktion: kategorisering, önskelista, bottenmeny (2026-07-27, enligt beställning "Inköpslista & barnens önskelista")

Byggde igenom hela P0-listan i beställningen. Tog självständiga beslut på alla fyra öppna frågor (dokumenterade i `PRODUCT_SPEC.md` 4b.8/4b.9) för att inte blockera på dig – hör av dig om något av dessa borde göras om:

- [x] **P0.1 Realtidssynk** – ingen websocket/push finns i appen, så löst med 5-sekunders polling (pausas när fliken inte är synlig) på inköpslistan och önskelistan. Enklaste sak som känns "levande" utan ny infrastruktur.
- [x] **P0.2 Kategorisering** – `ShoppingCategory`-enum (Frukt & grönt, Mejeri, Bröd, Fryst, Skafferi, Hushåll, Kött & fisk, Övrigt, Osorterat) + nyckelordsgissning (`lib/shoppingCategories.ts`, svenska+engelska ord) + `ShoppingCategoryMemory` som kommer ihåg manuella val per hushåll+varunamn. Kategori går att ändra direkt i listan.
- [x] **P0.3 Avbockning** – redan byggt tidigare (struken, flyttas ner). Lade till: automatisk rensning 24h efter köp via den befintliga dagliga cronen (`lib/cron.ts`), plus en manuell "Clear bought items"-knapp för den som vill rensa direkt.
- [x] **P0.4 Bottenmeny** – `app/dashboard/layout.tsx` + `components/BottomNav.tsx`. Tre flikar (Reminders/Shopping list/Wishlist), synliga på alla `/dashboard/*`-sidor, ett tryck för att byta. Notis-prick baserad på `localStorage` (se `lib/listBadges.ts`) om något nytt tillkommit sedan senaste besöket.
- [x] **P0.5–P0.7 Önskelista** – ny `WishlistItem`-modell + `/api/family/wishlist` (+ `[id]`) + ny sida `/dashboard/wishlist`. Barn lägger till egna önskningar (namn/länk/pris). Föräldrar ser alla barns listor grupperat, kan markera Reserved/Bought. **Köpstatus stripped server-side** ur svaret till barnet – inte bara dold i UI – så en framtida UI-bugg inte kan läcka den.
- [ ] **Klicktesta hela flödet** (se punkt 5 – konsoliderad lista).
- [ ] **P1/P2-punkterna** (streckkodsskanning, receptimport, delningslänk, butiksläge, röststyrning, platsnotiser, skafferi, måltidsplanering) är medvetet **inte** byggda – ligger kvar i `ROADMAP.md` under Fas 2/3 och parkerade idéer, enligt beställningens egen prioritering.

**Öppna frågor från beställningen – mina beslut (ändra om du vill annat):**
1. *Har barn redan profiler?* Ja – `isChildProfile` + `CHILD`-roll fanns redan, ingen ny förutsättning behövde byggas.
2. *Realtidssynk-mekanism?* Ingen fanns – valde polling (5s), se P0.1 ovan.
3. *Delningslänkar till släktingar?* P1, ej byggd. Rekommendation dokumenterad i `ROADMAP.md`: återanvänd `HouseholdInvite`-mönstret (token + utgångsdatum) när det blir aktuellt.
4. *Rensningsregel för avbockade varor?* 24h efter köp automatiskt + manuell "Clear bought items"-knapp, se P0.3 ovan.

## 5. Innan nästa kodsession
- [ ] **Kör `npx prisma generate && npx prisma db push` igen** – nya modeller/fält (`category` på `ShoppingListItem`, `ShoppingCategoryMemory`, `WishlistItem`) finns bara i `schema.prisma` än, inte i databasen. Sandboxen jag jobbar i kan inte nå `binaries.prisma.sh` (nätverksspärr), så jag har granskat schemat manuellt men inte kunnat köra `prisma generate`/`validate` här – samma mönster som förra sessionen, du behöver köra det lokalt.
- [ ] Kör `npm install` lokalt för att synka `node_modules` om det inte redan är gjort – kördes i sandboxen och patchade automatiskt några beroenden icke-brytande (`npm audit fix`), `package-lock.json` är uppdaterad.
- [ ] **Säkerhet:** `npm audit` visar att Next.js 14.2 har flera kända CVE:er (DoS, cache-poisoning, SSRF). Full fix kräver en major-uppgradering till Next 16 – för stort och riskabelt (potentiellt brytande ändringar över ~20 filer) för att göra utan regressionstestning. Prioritera som egen sprint innan skarp lansering med riktiga användare.
- [ ] Prisma flaggar att 5.22.0 → 7.9.0 finns tillgänglig (major-uppgradering). Samma resonemang som Next.js ovan – inte gjort nu. Låg prioritet så länge 5.22 fungerar.
- [ ] **Konsoliderad klicktest-lista** (allt som kräver en riktig webbläsare/telefon, inte min sandbox):
  - Glömt lösenord end-to-end: skicka mail till dig själv → sätt nytt lösenord → logga in.
  - PWA på mobil: öppna sajten → "Lägg till på hemskärmen" → verifiera att den känns som en app.
  - Inköpslista: lägg till en vara, se att den auto-kategoriseras rimligt, byt kategori manuellt och lägg till samma vara igen (ska minnas valet), bocka av, testa "Clear bought items".
  - Inköpslista med två inloggningar samtidigt (du + en till, eller två flikar): lägg till i en flik, se att den dyker upp i den andra inom ~5 sekunder.
  - Önskelista som barn: logga in som ett barn, lägg till en önskning, verifiera att ingenstans syns "reserverad"/"köpt" även efter att en förälder markerat den så.
  - Önskelista som förälder: markera en önskning som Reserved/Bought, verifiera att en annan vuxen ser det men barnet inte gör det.
  - Bottenmeny: verifiera att den syns och funkar på alla sidor (dashboard, family, shopping-list, wishlist, new/edit-reminder) och att notis-pricken dyker upp/försvinner rätt.
- [ ] Bestäm om du vill fortsätta på Fas 1-resten (beta-inbjudningar) eller fortsätta bygga ut Familj/Pro-spåret
