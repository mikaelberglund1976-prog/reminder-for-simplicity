# Product Spec – Reminder for Simplicity
**Version:** 2.3 | **Uppdaterad:** 2026-07-27 (kväll) | **Ägare:** Mikael Berglund
**Not:** Sektion 4b (Familj/Hushåll) tillagd 2026-07-26 för att dokumentera funktionalitet som redan byggts i kodbasen men saknades i specen. 2026-07-27: 4b.8 utökad och 4b.9–4b.10 tillagda utifrån beställningen "Inköpslista & barnens önskelista". 2026-07-27 (kväll): positionering breddad (§1, §3), 4b.11 (hamburgermeny/admin-åtkomst) och 4b.12 (mobil/webb-vy) tillagda.

---

## 1. Problemet vi löser

Människor glömmer viktiga datum och löpande kostnader. Abonnemang förnyas automatiskt utan att man tänker på det, försäkringar förnyas till sämre pris, presenter köps i sista minuten, viktiga avtal missas – och de flesta vet inte ens vad de spenderar per månad på abonnemang. Utöver det bär oftast en person i hushållet hela den mentala bördan: att komma ihåg vad som ska handlas, hålla koll på barnens önskningar utan att spoiler dem, och hantera sysslor – utspritt över flera olika appar.

**Reminder for Simplicity** är platsen där hela familjen samlar allt – påminnelser, en delad inköpslista, och önskelistor barnen äger själva. En enkel, överskådlig tjänst utan krångel. Ingen inlärningskurva, inga onödiga funktioner. **Inte bara en påminnelseapp** (beslut 2026-07-27, se sektion 3) – utan hemmets gemensamma bas.

> "Allt din familj behöver komma ihåg, handla och önska sig – på ett lugnt ställe."

---

## 2. Målgrupp

**Primär:** Privatpersoner 25–55 år som vill ha koll på sina kostnader och viktiga datum utan att behöva lära sig ett komplicerat verktyg.

**Sekundär:** Småföretagare som vill hålla koll på leverantörsavtal, licenser och förnyelsedatum.

**Tonalitet:** Enkel, varm, organiserad.

---

## 3. Positionering

**Beslut 2026-07-27:** vi breddar positioneringen. Ursprungligen (v1–2.1) positionerade vi oss enbart mot "det som kostar pengar och har ett datum" – abonnemang, försäkringar, avtal. Det stämmer inte längre mot vad appen faktiskt gör (familjehushåll, delad inköpslista, barns önskelistor, sysslor). Mikael beslutade att startsidan och positioneringen ska "tänka stort" och inte begränsa sig till att vara "bara en reminder-app".

**Ny positionering:** vi är fortfarande inte ett generellt uppgiftshanteringsverktyg (konkurrerar inte med Todoist/TickTick) – men vi är inte längre enbart en nischad påminnelsetjänst för fakturor och datum. Vi är **hemmets gemensamma bas**: det ställe där en familj samlar allt som annars sprids ut över flera olika appar och en persons huvud – påminnelser om pengar och datum, en delad inköpslista, och önskelistor barnen kontrollerar själva. Det som fortfarande gör oss enkla att förstå: allt vi bygger kopplar till **hushållet**, inte till generella att-göra-listor.

*Praktiskt: landningssidan (`app/src/app/page.tsx`) och SEO-metadata (`layout.tsx`) uppdaterades 2026-07-27 för att spegla detta – ny rubrik "Everything your family needs to remember, buy, and want", tre feature-pills (Reminders/Shopping list/Wishlists), och telefonmockupen visar nu inköpslista + önskelista, inte bara abonnemang.*

---

## 4. MVP – Kärnfunktioner (Fas 1)

### 4.1 Autentisering
- Registrera konto med email + lösenord
- Logga in / logga ut
- Glömt lösenord (email-återställning)
- *(Framtid: Google/Apple login)*

### 4.2 Snabbval – Populära tjänster med logotyp
Användaren kan välja en känd tjänst direkt istället för att skriva – namn och kategori fylls i automatiskt.

**Streaming & underhållning:**
Netflix, Spotify, HBO Max, Disney+, Apple TV+, YouTube Premium, Viaplay, C More

**Verktyg & produktivitet:**
Adobe Creative Cloud, Microsoft 365, Dropbox, Google One, iCloud, Notion, LastPass

**Försäkringar & bank:**
Hemförsäkring, Bilförsäkring, Livförsäkring, Sjukförsäkring, Kreditkort

**Dokument:**
Pass, Körkort, Bilregistrering, ID-kort, Medlemskort

### 4.3 Reminders (kärnan)
Användaren skapar en påminnelse med:
- **Namn** – t.ex. "Netflix", "Mammas födelsedag", "Bilförsäkring"
- **Kategori** – Abonnemang, Födelsedag, Försäkring, Avtal, Dokument, Övrigt
- **Datum** – När förfaller/förnyas det?
- **Belopp (valfritt)** – Kostnad per månad/år
- **Återkommande** – Engång, Månadsvis, Kvartalsvis, Årsvis
- **Påminn mig** – 1, 3, 7, 14 eller 30 dagar innan
- **Notering (valfritt)** – Fri text

### 4.4 Dashboard
- Lista alla påminnelser sorterat på närmast i tid
- Filtrera per kategori
- Markera påminnelse som hanterad
- Redigera / ta bort påminnelse
- Tydlig "nästa 30 dagar"-vy

### 4.5 Kostnadsgraf 💰
- Stapelgraf som visar total kostnad per månad
- Baseras på påminnelser med belopp
- Visar innevarande år (jan–dec)
- Enkel summering: "Du spenderar ~X kr/månad på abonnemang"

### 4.6 Email-påminnelser
- Skickas automatiskt X dagar innan (användarens val: 1, 3, 7, 14, 30 dagar)
- Tydlig email med: vad det gäller, datum, belopp (om angivet)
- Avregistreringslänk (GDPR-krav)

---

## 4b. Familj/Hushåll (byggt, ej i ursprunglig MVP-scope)

Denna funktionalitet finns i kodbasen (Prisma-modeller `Household`, `HouseholdMember`, `HouseholdInvite`, `ChoreCompletion`, `FamilyTrial`) men beskrevs aldrig i version 1–2.0 av specen. Dokumenteras här som nuläge.

### 4b.1 Hushåll & roller
- Ett hushåll (`Household`) kan ha flera medlemmar med roll: **OWNER, PARENT, ADULT, CHILD, MEMBER**
- Inbjudan via email-länk (`HouseholdInvite`) – mottagaren går automatiskt med i hushållet vid nästa inloggning/registrering
- Admin kan manuellt hantera medlemmar (lägga till/ta bort) via adminpanelen

### 4b.2 Barnprofiler
- Barn kan få en egen profil (`isChildProfile = true`) med **PIN-inloggning** istället för email/lösenord
- Föräldrar skapar och hanterar barnprofiler från profilsidan

### 4b.3 Sysslor (Chores)
- Reminders med kategori `CHORE` kan tilldelas ett barn, med valfritt krav på godkännande (`requiresApproval`)
- Barn markerar sysslan som klar per vecka (`ChoreCompletion`, unikt per barn+vecka)
- Förälder godkänner (`ChoreStatus`: DONE → PENDING_APPROVAL → APPROVED)
- Föräldrar ser statistik över tid via `/api/family/stats`

### 4b.4 Familje-trial
- Ett hushåll kan starta en tidsbegränsad provperiod för familjefunktioner (`FamilyTrial`), kopplad till ett barn och den vuxen som startade den

### 4b.5 Handover & delning av reminders
- En reminder kan tilldelas en specifik person (`assignedTo`), ha en fallback-mottagare (`fallbackTo`), och överlämnas mellan hushållsmedlemmar (`handoverState`: NONE → PENDING → ACCEPTED)
- Synlighet styrs per reminder: **PRIVATE / HOUSEHOLD / PARENTS**
- Brådskandegrad: **STANDARD / HIGH / CRITICAL**

### 4b.6 Pro-status
- Hushåll kan flaggas som `is_pro` – **idag en manuell admin-toggle, inte ett betalflöde.** Stripe-integration (se sektion 6) är inte byggd än.

### 4b.7 Admin-panel
- Separat adminyta (`/admin`, skyddad av `ADMIN_EMAIL`) för att hantera användare, hushåll/familjer, trigga cron manuellt och skicka test-email

### 4b.8 Delad inköpslista (`ShoppingListItem`, byggd 2026-07-27, utökad 2026-07-27 enligt beställning nedan)

Ett hushåll har en delad inköpslista – vem som helst i hushållet (även barn) kan lägga till, bocka av och ta bort varor. Varje vara har namn, valfri mängd (fri text, t.ex. "2 liter"), spårar vem som la till/bockade av den, och har nu en **kategori** (`ShoppingCategory`).

- **Realtidssynk (P0.1):** löst med *polling* – klienten hämtar listan var 5:e sekund medan fliken är synlig, pausar när den inte är det. Ingen websocket/push-infrastruktur finns i appen idag; se beslut nedan.
- **Kategorisering per butiksavdelning (P0.2):** `PRODUCE, DAIRY, BREAD, FROZEN, PANTRY, HOUSEHOLD, MEAT_FISH, OTHER, UNSORTED`. Nya varor kategoriseras automatiskt via en nyckelordslista (`lib/shoppingCategories.ts`, engelska + svenska ord). Om användaren byter kategori manuellt sparas valet per hushåll+varunamn (`ShoppingCategoryMemory`) och återanvänds nästa gång samma vara läggs till.
- **Avbockning (P0.3):** avbockad vara stryks, tonas ner och flyttas längst ner ("Already in the cart"). Den rensas **inte** direkt – se beslut om rensningsregel nedan.
- Samma åtkomstregel som Sysslor: kräver `is_pro` eller aktiv `FamilyTrial` på hushållet.
- Nås via "🛒 Shopping list"-knappen på `/dashboard/family` **och** via den nya bottenmenyn (se 4b.10), egen sida på `/dashboard/family/shopping-list`.
- API: `GET/POST/DELETE /api/family/shopping-list` (DELETE = rensa alla köpta varor), `PATCH/DELETE /api/family/shopping-list/[id]`.

**Beslut på öppna frågor (2026-07-27), tagna för att hålla v1 användarvänlig utan att bygga ny infrastruktur i onödan:**
1. *Realtidssynk-mekanism* – Ingen websocket/push finns idag. Beslut: 5-sekunders polling i v1 (enkelt, ingen ny infra, "känns" realtid för en hushållslista). Om användningen växer och polling känns trögt, är websocket ett Fas 2-item.
2. *Regel för rensning av avbockade varor* – Beslut: avbockade varor ligger kvar synligt struket längst ner tills (a) någon trycker "Clear bought items", eller (b) 24 timmar har gått sedan köpet, då den dagliga cronen (`lib/cron.ts`) rensar dem automatiskt. Detta undviker att varor försvinner för snabbt (man vill kunna se vad som redan är köpt när man står i affären) samtidigt som listan inte växer i evighet.

---

### 4b.9 Önskelista (`WishlistItem`, byggd 2026-07-27)

Varje barn har sin egen önskelista, separat från den delade inköpslistan (P0.5).

- **Barn lägger till egna önskningar:** namn, valfri länk och pris. Kopplas till barnets `childId`, inte till hushållet i stort.
- **Dold köpstatus (P0.6):** ett barn ser **aldrig** status, reservation eller köp-markering på sin egen lista – varken som text, ikon eller sorteringsordning. Detta är inte bara en UI-regel: API:et (`GET/PATCH /api/family/wishlist`) bygger ett separat, "barn-säkert" svar som helt utesluter fälten `status/reservedBy/reservedAt/purchasedBy/purchasedAt` när mottagaren är barnet självt, och sorterar bara på `createdAt` – aldrig efter status. En förälder kan alltså inte av misstag läcka status till barnet via en bugg i frontend, eftersom fälten aldrig lämnar servern i det svaret.
- **Föräldrar reserverar/markerar köpt (P0.7):** vuxna (OWNER/PARENT/ADULT) ser alla barns listor grupperade per barn, med status **Wanted / Reserved / Bought** och vem som reserverat/köpt – synligt för andra vuxna (för att undvika dubbelköp), aldrig för barnet.
- I v1 lägger endast barnet till på sin egen lista (vuxna lägger inte till å barnets vägnar) – matchar beställningens ordalydelse. Kan utökas senare om det visar sig behövas i praktiken.
- Samma Pro/trial-spärr som övriga familjefunktioner.
- Nås via bottenmenyn (se 4b.10), egen sida på `/dashboard/wishlist`.
- API: `GET/POST /api/family/wishlist`, `PATCH/DELETE /api/family/wishlist/[id]`.

### 4b.10 Bottenmeny / navigering (byggd 2026-07-27)

- Tre flikar – **Reminders, Shopping list, Wishlist** – alltid synliga längst ned på alla `/dashboard/*`-sidor (`app/dashboard/layout.tsx` + `components/BottomNav.tsx`). Att byta flik tar ett tryck, ingen laddningsfördröjning.
- Liten röd notis-prick på en flik om något lagts till sedan senaste besöket. Löst utan ny databastabell: varje listsida sparar "senast sedd" (tidsstämpel) i `localStorage` när den laddas (`lib/listBadges.ts`), och menyn jämför det med den senaste varans `createdAt`. Enkel och tillräcklig lösning för ett hushåll – om appen skalar till fler användare per konto/enhet bör detta bli en riktig "senast läst"-kolumn per användare istället.
- Bottenmeny valdes enligt beställningens motivering: branschstandard, minst antal tryck för 2–4 toppnivåer.
- Menyns egen bakgrund är breddbegränsad till samma `--content-max-width` som resten av appen (se 4b.12) med rundade överkanter, istället för att gå kant-till-kant över hela skärmen – annars såg den trasig ut på breda skärmar (vit rand med flikarna klumpade i mitten).
- **Bugghistoria:** `/dashboard` hade tidigare sin egen inbyggda bottenmeny (Reminders/History/Settings/+) som byggdes innan den delade menyn fanns. De krockade visuellt (låg på varandra) tills den gamla togs bort 2026-07-27 – se 4b.11 för var funktionerna hamnade istället.

### 4b.11 Hamburgermeny för allt som inte har en egen flik (byggd 2026-07-27)

Bottenmenyns tre flikar räcker inte för allt – Family-hubben, Settings, Admin-panelen och utloggning behövde också vara nåbara utan att skriva URL:er för hand.

- `components/HamburgerMenu.tsx`: en ☰-knapp längst till höger i sidhuvudet, öppnar en dropdown med **Reminders, Family, Settings**, och **Admin** (endast om `session.user.email === ADMIN_EMAIL` – samma konstant som skyddar `/admin` själv, delad via `lib/adminConfig.ts` för att inte kunna divergera), plus **Sign out** längst ner.
- Placerad som en vanlig flex-sibling bredvid sidtiteln (`<h1 style="flex:1">`) i stället för en fristående `position:fixed`-knapp – annars hade den riskerat att hamna ovanpå titeltexten på smala mobilskärmer, samma typ av bugg som bottenmenyn hade mot `/dashboard`s gamla meny.
- Tillagd i sidhuvudet på: `/dashboard` (Reminders), `/dashboard/family`, `/dashboard/family/shopping-list`, `/dashboard/wishlist` – de sidor användaren faktiskt "bor" på. Djupare formulärsidor (skapa/redigera reminder, bjud in familjemedlem) har medvetet bara tillbaka-knapp, som är standard UX för uppgiftsflöden.
- **Innan detta:** `/admin` gick bara att nå genom att skriva URL:en direkt i webbläsaren – ingen länk fanns i appen.

### 4b.12 Mobil/webb-vy-växlare (byggd 2026-07-27)

En enkel lösning på att appens smala kolumn (480px) ser gles ut på en stor datorskärm, utan att bygga om varje sidas layout:

- En CSS-variabel, `--content-max-width` (`globals.css`), styr bredden på **alla** sidor. Ett `data-view="mobile"|"web"`-attribut på `<html>` växlar variabelns värde mellan `480px` (mobil, förvalt) och `1040px` (webb).
- Väljare under **Profile → Preferences → Display**: "📱 Mobile view" / "🖥️ Web view". Sparas per enhet i `localStorage` (`lib/viewMode.ts`). Ett litet script i `<head>` (`VIEW_MODE_INIT_SCRIPT`) sätter attributet innan sidan målas upp, så det inte blinkar till fel bredd vid laddning.
- **Viktigt att förstå gränsen för detta:** "Web view" gör den befintliga kolumnen bredare – det är fortsatt en enkolumns-layout, inte en omdesignad desktop-upplevelse med sidopanel eller grid. En riktig egen desktop-layout är ett separat, större projekt (se öppen fråga i `TODO.md` 4e/4f).

---

## 5. Fas 2 – Tillväxtfunktioner (efter MVP-validering)

- [ ] **WhatsApp-påminnelser** – Alternativ kanal till email, högre öppningsgrad
- [ ] **Push-notiser** – Via PWA (Progressive Web App, ingen app att ladda ner)
- [ ] **Gratis provperiod-tracker** – "Min Netflix-trial slutar om X dagar"
- [ ] **Dela påminnelse** – Skicka en påminnelse till familjemedlem/partner
- [ ] **Månadsöversikt i email** – "Nästa månads påminnelser" varje 1:a
- [ ] **Google Calendar-synk** – Påminnelserna syns i din kalender
- [ ] **Import från CSV** – Lägg in flera på en gång

---

## 6. Fas 3 – Skalning & Monetisering

- [ ] **Prenumeration** – Månads- eller årsvis betalning via Stripe
  - Gratisnivå: max 10 påminnelser
  - Premium: obegränsat + WhatsApp + SMS
- [ ] **SMS-påminnelser** – Via Twilio
- [ ] **Familj-/partnerkonto** – Delade listor för hushållet
- [ ] **API** – För integrationer mot bokföringsprogram mm
- [ ] **iOS-app** – Native app när webb-MVP är validerad

---

## 7. Affärsmodell

**Nuläge:** Pro-status sätts idag manuellt av admin per hushåll (`is_pro`-toggle). Inget betalflöde är kopplat ännu – se Fas 2.

**Prenumeration (primär, planerad):**
- Gratis: upp till 10 påminnelser, email-notiser
- Premium (~49 kr/mån eller ~399 kr/år): obegränsat, WhatsApp, SMS, kalendersynk, prioriterad support

**Målsättning år 1:**
- 500 gratis-användare inom 6 månader
- 50 betalande användare = ~25 000 kr/år ARR
- 200 betalande = ~100 000 kr/år ARR

---

## 8. Teknisk arkitektur (Webb MVP)

```
┌─────────────────────────────────────┐
│         Next.js 14 (App Router)     │
│  ┌──────────────┐  ┌──────────────┐ │
│  │   Frontend   │  │  API Routes  │ │
│  │  (React +    │  │  (REST)      │ │
│  │   Tailwind)  │  │              │ │
│  └──────────────┘  └──────┬───────┘ │
└─────────────────────────────────────┘
                            │
              ┌─────────────┴──────────────┐
              │                            │
        ┌─────▼──────┐            ┌───────▼──────┐
        │  Supabase   │            │    Resend    │
        │ PostgreSQL  │            │   (Email)    │
        │ + Auth      │            └──────────────┘
        └─────────────┘
              │
        ┌─────▼──────┐
        │   Vercel   │
        │  Cron Jobs │ ← Kör dagligen kl 08:00
        └────────────┘
```

### Datamodell (nuläge, ur `app/prisma/schema.prisma`)

**User**
`id, email, password?, name?, emailVerified?, phone?, preferredCurrency, timezone, isChildProfile`

**Reminder**
`id, userId, householdId?, name, category, date, recurrence, amount?, currency, note?, reminderDaysBefore, isActive, lastSentAt?` + Pro-fält: `assignedTo, fallbackTo, visibility, handoverState, handoverTo, handoverInitiatedAt, urgencyLevel` + Chore-fält: `requiresApproval, choreRecurrenceDays`

**Household / HouseholdMember / HouseholdInvite**
Hushåll, medlemskap med roll (OWNER/PARENT/ADULT/CHILD/MEMBER), inbjudningar med token + utgångsdatum

**ChoreCompletion**
`id, reminderId, childId, weekStart, status (DONE/PENDING_APPROVAL/APPROVED), approvedBy?, approvedAt?`

**FamilyTrial**
`id, householdId, startedAt, expiresAt, childId, createdBy`

**ReminderLog**
`id, reminderId, sentAt, type`

**PasswordResetToken** *(tillagd 2026-07-27)*
`id, userId, token, expiresAt, usedAt?, createdAt` – engångstoken för glömt lösenord-flödet, 1 timmes giltighet

**ShoppingListItem** *(tillagd 2026-07-27, `category`-fält tillagt 2026-07-27)*
`id, householdId, name, quantity?, category (ShoppingCategory), isPurchased, addedBy, purchasedBy?, purchasedAt?` – delad inköpslista per hushåll, se 4b.8

**ShoppingCategoryMemory** *(tillagd 2026-07-27)*
`id, householdId, itemName, category` – unikt per hushåll+varunamn, kommer ihåg senaste manuella kategorival så samma vara auto-sorteras rätt nästa gång, se 4b.8

**WishlistItem** *(tillagd 2026-07-27)*
`id, householdId, childId, addedBy, name, url?, price?, currency?, imageUrl?, note?, status (WANTED/RESERVED/PURCHASED), reservedBy?, reservedAt?, purchasedBy?, purchasedAt?` – barns egna önskelista, se 4b.9. **Viktigt:** `status`-fältet och relaterade fält exponeras aldrig till det ägande barnet via API:et – se 4b.9.

*Obs: "ServicePreset" (snabbval med logotyp, sektion 4.2) finns implementerat i `dashboard/new/page.tsx` och `dashboard/[id]/edit/page.tsx` som en hårdkodad lista i frontend (t.ex. Netflix), inte som en egen databastabell/Prisma-modell.*

---

## 9. Design & UX-principer

1. **Max 3 klick** för att lägga till en påminnelse
2. **Inga obligatoriska fält utom namn och datum** – resten är valfritt
3. **Mobilanpassad** – fungerar perfekt på telefon i webbläsaren
4. **Engelska som primärspråk** *(beslutat 2026-07-26 – matchar den redan byggda appen. Tidigare version av denna spec sa svenska; det var fel/inaktuellt.)*
5. **Snabbval framför formulär** – välj "Netflix" istället för att skriva

---

## 10. Icke-funktionella krav

- **GDPR-kompatibel** – Integritetspolicy, rätt att radera data, unsubscribe-länk
- **Säkerhet** – Bcrypt för lösenord, JWT för sessions, HTTPS always
- **Prestanda** – Dashboard laddar < 1 sekund
- **Tillgänglighet** – Fungerar utan JavaScript disabled (grundläggande)

---

## 11. Framgångskriterier för MVP

- 50 registrerade användare inom 30 dagar
- 80% av användare skapar minst 1 påminnelse
- Email open rate > 40%
- 5 betalande användare inom 60 dagar
- NPS > 40 från de 20 första användarna
- 0 kritiska säkerhetsbuggar

---

*Detta dokument är den enda källan till sanning om vad vi bygger. Uppdatera vid varje produktbeslut.*
