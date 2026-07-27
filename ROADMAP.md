# Roadmap – Reminder for Simplicity
**Senast uppdaterad:** 2026-07-27 kväll (hamburgermeny + mobil/webb-vy-växlare tillagda, ovanpå dagens tidigare inköpslista/önskelista/bottenmeny-arbete)

---

## Fas 1 – MVP (klar, långt förbi ursprungsplanen)
**Mål:** En fungerande produkt som de 10 första användarna kan testa.

### Vecka 1-2 – Grundstruktur
- [x] Projektstruktur & ramverk
- [x] Product Spec & Roadmap
- [x] Next.js-projekt uppsatt med Prisma + PostgreSQL (Supabase)
- [x] Autentisering (registrera, logga in, logga ut) – email/lösenord **och** Google OAuth
- [x] Glömt lösenord (email-återställning) – byggt 2026-07-27: `/forgot-password`, `/reset-password`, nytt `PasswordResetToken`-schema. Kräver `npx prisma db push` innan det fungerar i din databas.

### Vecka 3-4 – Kärn-features
- [x] Dashboard (visa alla reminders)
- [x] Skapa reminder (formulär)
- [x] Redigera / ta bort reminder
- [x] Kategorier och filter (SUBSCRIPTION, BIRTHDAY, INSURANCE, CONTRACT, HEALTH, BILL, CHORE, OTHER)

### Vecka 5-6 – Email & polish
- [x] Email-påminnelser via Resend
- [x] Cron job (daglig check av reminders att skicka) – `app/src/lib/cron.ts` + `/api/cron/send-reminders`
- [x] Admin-triggad manuell cron-körning (`/api/admin/trigger-cron`) + test-email endpoint
- [~] Mobilanpassad design (responsive) – PWA-manifest + service worker finns (`public/manifest.json`, `public/sw.js`), kodgranskad 2026-07-27 (ser korrekt ut), men riktig test på telefon är fortfarande inte gjord
- [x] Landningssida live – `app/src/app/page.tsx` är den riktiga landningssidan. Den fristående `landing-page.html` (svenska, gammal palett) var en inaktuell kvarleva och har tagits bort 2026-07-27.

### Vecka 7 – Beta-lansering
- [ ] Bjud in 10 testanvändare
- [ ] Samla feedback
- [ ] Fixa kritiska buggar

---

## Fas 1.5 – Family/Pro (byggt, inte i ursprunglig plan)
Detta är inte i ursprungsspecen men är den funktionalitet flest commits gått till senaste tiden.

- [x] Hushåll (Household) – flera användare delar reminders
- [x] Roller: OWNER, PARENT, ADULT, CHILD, MEMBER
- [x] Inbjudningar till hushåll via email-länk (auto-join vid inloggning)
- [x] Admin-panel: hantera användare, hushåll, lägg till/ta bort medlemmar
- [x] Admin: manuell Pro-toggle per hushåll (`is_pro`) – **inget Stripe/betalflöde ännu**
- [x] Barn-profiler med PIN-inloggning (`isChildProfile`, child-profiles API)
- [x] Sysslor/chores – tilldelning, veckovis completion (`ChoreCompletion`), godkännande av vuxen
- [x] Familje-trial (`FamilyTrial`) – tidsbegränsad provperiod för 1 barn
- [x] Handover-flöde för reminders (tilldela/överlämna till annan hushållsmedlem, fallback-mottagare)
- [x] Urgency levels (STANDARD/HIGH/CRITICAL) och visibility (PRIVATE/HOUSEHOLD/PARENTS) på reminders
- [x] Föräldra-statistik över tid (`/api/family/stats`)
- [x] **Delad inköpslista (2026-07-27)** – `ShoppingListItem`, `/dashboard/family/shopping-list`, samma Pro/trial-gate som sysslor
- [x] **Inköpslista utökad enligt beställning (2026-07-27):** kategorisering per butiksavdelning med minnesfunktion (`ShoppingCategoryMemory`), "Clear bought items"-knapp, automatisk rensning 24h efter köp via cron, 5-sekunders polling för nästan-realtidssynk mellan hushållsmedlemmar
- [x] **Önskelista (2026-07-27):** `WishlistItem` – barn lägger till egna önskningar, föräldrar reserverar/markerar köpt, köpstatus aldrig synlig för barnet (server-side, inte bara UI). `/dashboard/wishlist`
- [x] **Bottenmeny (2026-07-27):** Reminders/Shopping list/Wishlist alltid synlig på `/dashboard/*`, ett tryck för att byta, notis-prick vid nya varor/önskningar sedan senaste besök
- [x] **Hamburgermeny (2026-07-27):** Family/Settings/Admin/Sign out samlade i en meny i sidhuvudet – `/admin` gick tidigare bara att nå via direkt URL, nu länkad (villkorat på admin-email)
- [x] **Mobil/webb-vy-växlare (2026-07-27):** en CSS-variabel styr sidbredden app-brett; växlare i Profile → Preferences ger en bredare enkolumns-vy på dator. Inte en full desktop-omdesign – se PRODUCT_SPEC 4b.12

**Detta bör dokumenteras formellt i PRODUCT_SPEC.md** – se uppdaterad version (4b.8–4b.10).

---

## Fas 2 – Tillväxt
**Mål:** 250 aktiva användare, validera betalningsvilja.

- [x] Google Login *(redan klart – flyttad hit från "klart i Fas 1")*
- [ ] Månatlig email-digest ("Nästa månads påminnelser")
- [ ] Kostnadssummering per kategori
- [ ] Push-notiser (PWA) – grunden finns (manifest + sw.js) men push-logik saknas
- [x] Dela reminder med annan användare *(löst via Household/visibility, inte separat delningsfunktion)*
- [ ] Import via CSV
- [ ] Riktig betalvägg (Stripe) – ersätter dagens admin-manuella Pro-toggle
- [ ] **Streckkodsskanning/foto-tillägg av varor** *(P1.1 i beställningen 2026-07-27 – snabb inköpslista-tillägg via kamera)*
- [ ] **Enkel receptimport → inköpslista** *(P1.2 – lägg till ingredienser med ett klick)*
- [x] **Delningslänk för inköpslistan (2026-07-27)** *(P1.3-varianten för Grocery, byggd efter jämförelse med OurGroceries/Listonic)* — `Household.shoppingListShareToken`, `/api/family/shopping-list/share` (av/på + länk), publika `/api/public/shopping-list/[token]` + `/shop/[token]`-sidan. Ingen inloggning krävs, full läs/skriv-åtkomst (samma förtroendemodell som `HouseholdInvite`-token). Wishlist-varianten (P1.3 för barnens önskelista, delning till släktingar) är fortfarande inte byggd.
- [ ] **Butiksläge** *(P1.4 – fullskärmsvy för användning i affären: stor text, en-handsvänlig)*

---

## Fas 3 – Skala (Höst 2026)
**Mål:** 1000+ användare, lönsam produkt.

- [ ] SMS-påminnelser
- [ ] API för tredjeparts-integrationer
- [x] Familje/team-konton *(byggt tidigare än planerat – se Fas 1.5)*
- [ ] Mobilapp (React Native)
- [ ] Google/Apple Calendar sync
- [ ] Affiliate-program

---

## Parkerade idéer (kanske, kanske inte)
- AI-analys av abonnemang ("Du betalar 3 videotjänster, vill du rensa?")
- Browser extension för att auto-detektera abonnemang
- Partnerskap med banker för att importera transaktioner
- **Röststyrning (Siri/Google Assistant)** för inköpslistan *(P2.1 i beställningen 2026-07-27)*
- **Platsbaserade notiser** vid butiken *(P2.2 – kräver platsbehörighet)*
- **Skafferihantering** *(P2.3 – separat funktionsområde, egen spec vid behov)*
- **Måltidsplanering** som genererar inköpslista *(P2.4)*

---

## Kända avvikelser att städa upp
- ~~"AssistIQ" (gammalt projektnamn) fanns kvar i `schema.prisma` och `sw.js`.~~ **Löst 2026-07-27 – långt mer utbrett än väntat:** samma kvarleva fanns även i `manifest.json` (PWA-appnamn), `layout.tsx` (sidtitel/OpenGraph), flera loading-states, header-loggor (register/join-household/admin) och **alla utgående transaktionsmail** (`email.ts` – ämnesrader, header, footer på reminder-, invite-, handover- och welcome-mail). Allt bytt till "Reminder for Simplicity".
- ~~Färgpaletten i `BRAND.md` (`#4F6EF7`) matchade varken `RFS-Product-Direction.md` (`#4A5FD5`) eller `globals.css` (`#5B9CF5`).~~ **Löst 2026-07-26:** `#4A5FD5` (från `RFS-Product-Direction.md`) valdes som sanning. Genomfört i `globals.css`, `BRAND.md` och samtliga `.tsx`-filer i `app/src` + `public/manifest.json`.
- ~~`landing-page.html` (svenska, gammal palett) och `app/src/app/page.tsx` (engelska, ny palett) var två helt olika hero-sektioner.~~ **Löst 2026-07-27:** `landing-page.html` borttagen, `page.tsx` är den enda landningssidan.
- ~~**Språkmotsägelse:** Hela den byggda appen är på engelska, men `PRODUCT_SPEC.md` §9 angav svenska som primärspråk för MVP.~~ **Löst 2026-07-26:** engelska är primärspråk, matchar redan byggd app. PRODUCT_SPEC.md uppdaterad.
- ~~Arbetskopian hade CRLF-radslut (Windows-kopiering), `app/.gitignore` var UTF-16-kodad och innehöll bara `app/.env`, och `app/.env.local` var likaså UTF-16-kodad vilket gjorde att flera miljövariabler tystnat föll bort.~~ **Löst 2026-07-27:** `.gitattributes` tillagd + renormaliserat, `.gitignore` (rot + app) omskrivna i UTF-8, `.env.local` omskriven i UTF-8 med alla nycklar ifyllda (`GOOGLE_CLIENT_ID/SECRET` medvetet tomma – se Todo).
- **Nytt fynd (2026-07-27):** `npm audit` visar att Next.js 14.2 har flera kända säkerhetsluckor (DoS, cache-poisoning, SSRF). Full fix kräver major-uppgradering till Next 16 – för stort/riskabelt för att göra utan din granskning, se Todo punkt 5.

---

*Denna roadmap är ett levande dokument. Uppdatera efter varje sprint.*
