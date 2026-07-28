# Product Spec – Reminder for Simplicity
**Version:** 2.10 | **Uppdaterad:** 2026-07-28 (natt) | **Ägare:** Mikael Berglund
**Not:** Sektion 4b (Familj/Hushåll) tillagd 2026-07-26 för att dokumentera funktionalitet som redan byggts i kodbasen men saknades i specen. 2026-07-27: 4b.8 utökad och 4b.9–4b.10 tillagda utifrån beställningen "Inköpslista & barnens önskelista". 2026-07-27 (kväll): positionering breddad (§1, §3), 4b.11 (hamburgermeny/admin-åtkomst) och 4b.12 (mobil/webb-vy) tillagda. 2026-07-27 (sen kväll): 4b.2 uppdaterad med kravet på riktig email, 4b.13 (frivillig PIN-inloggning för vuxna) tillagd, båda klicktestade skarpt. 2026-07-28: 4b.14 (kategorihantering, tight layout, optimistisk UI, varor ligger kvar tills manuell rensning) och 4b.15 (flera listor per hushåll med åtkomststyrning, notis/länk/bild på varor) tillagda efter feedback på hur trögt/klumpigt inköpslistan kändes. 2026-07-28 (kväll): 4b.16 (fem quick wins efter Best4Family-analysen: sekretess-chip, dataexport, broadcast-notis, PIN/Google-bugg fixad) och 4b.17 (kända ej byggda gap, bl.a. att Delete account-knappen bara är en UI-shell) tillagda. 2026-07-28 (natt): 4b.18 tillagd – "Ideas & voting", en delad förbättringsförslag-/röstningssektion, byggd efter en EU-marknadsundersökning (se `MARKET_RESEARCH_EU.md`) som visade att flera konkurrenter redan har publika röstningssidor. 4b.19 tillagd – Training-bokningar och utgående ICS-kalendersynk. **2026-07-28 (natt, sent): School korrigerad till en egen sektion (inte del av vanliga Reminders) efter direkt feedback från Mikael – se 4b.19's School-del och `dashboard/school/page.tsx`.**

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
- Barn kan få en egen profil (`isChildProfile = true`) med **PIN-inloggning** istället för email/lösenord i vardagen
- Föräldrar skapar och hanterar barnprofiler från profilsidan
- **Kräver riktig email (beslut 2026-07-27):** varje konto ska ha en äkta email på fil, som kontots grundläggande identitet – även barn som aldrig använder den för att logga in. Föräldern skriver in valfri riktig adress vid skapandet (sin egen, ett alias som `du+barnnamn@gmail.com`, eller barnets egen). Ersätter den tidigare påhittade `child_xxx@reminder-for-simplicity.internal`-adressen. Beslutet: **ett hushåll per person** (inte multi-hushåll), men alla konton – vuxna och barn – ska ha en riktig email.

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
- **Avbockning (P0.3):** avbockad vara stryks, tonas ner och flyttas längst ner ("Already in the cart"). Den rensas **inte** direkt – se beslut om rensningsregel nedan. **Ändrad 2026-07-28: den automatiska 24h-rensningen är borttagen** (se 4b.14) – avbockade varor ligger nu kvar tills man själv trycker "Clear bought items", eftersom man ofta köper samma saker igen och vill kunna se/återanvända listan som referens.
- Samma åtkomstregel som Sysslor: kräver `is_pro` eller aktiv `FamilyTrial` på hushållet.
- Nås via "🛒 Shopping list"-knappen på `/dashboard/family` **och** via den nya bottenmenyn (se 4b.10), egen sida på `/dashboard/family/shopping-list`.
- API: `GET/POST/DELETE /api/family/shopping-list` (DELETE = rensa alla köpta varor), `PATCH/DELETE /api/family/shopping-list/[id]`.

**Beslut på öppna frågor (2026-07-27), tagna för att hålla v1 användarvänlig utan att bygga ny infrastruktur i onödan:**
1. *Realtidssynk-mekanism* – Ingen websocket/push finns idag. Beslut: 5-sekunders polling i v1 (enkelt, ingen ny infra, "känns" realtid för en hushållslista). Om användningen växer och polling känns trögt, är websocket ett Fas 2-item.
2. *Regel för rensning av avbockade varor* – Ursprungsbeslut 2026-07-27: 24h auto-rensning via cron + manuell "Clear bought items"-knapp. **Ändrat 2026-07-28** efter feedback: auto-rensningen togs bort helt (se 4b.14) – varor ligger kvar tills man själv rensar, eftersom de fungerar som en användbar "brukar köpa"-referens.

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

### 4b.10 Bottenmeny / navigering (byggd 2026-07-27, gjord anpassningsbar 2026-07-28)

- **Ursprungligen** tre hårdkodade flikar (Reminders/Shopping list/Wishlist), sedan fyra efter att Calendar lades till 2026-07-28 (se 4b.19). **Från 2026-07-28 (kväll) är menyn per-person-anpassningsbar**, efter direkt beställning ("under sin person kunna säga vilka av apparna som ska ligga i bannern"):
  - **Calendar är alltid längst till vänster och går inte att ta bort** – den enda låsta fliken.
  - Resten (3 eller 4 av: `reminders`/`shopping-list`/`wishlist`/`chores`/`training`/`school`) väljs av varje person själv under **Profile → Preferences → "Bottom nav"** – klickbara chips, sparas direkt (samma optimistiska mönster som web/mobile-vyväxlaren i 4b.12).
  - Nytt fält `User.bottomNavTabs` (kommaseparerad sträng av app-nycklar, `null` = använd default). Default: **Reminders, Shopping list, School** (+ Calendar = 4 totalt).
  - `components/BottomNav.tsx` är nu datadriven (en `APP_TABS`-lookup + `CALENDAR_TAB` konstant) istället för en hårdkodad array – hämtar personens val via `GET /api/profile` vid sidladdning.
  - Allt som *inte* ligger i bottenmenyn är fortfarande fullt nåbart via hamburgermenyn (se 4b.11), som medvetet alltid visar allt oavsett vad som är valt här.
- Liten röd notis-prick på en flik om något lagts till sedan senaste besöket (oförändrat sedan 2026-07-27). Löst utan ny databastabell: varje listsida sparar "senast sedd" (tidsstämpel) i `localStorage` när den laddas (`lib/listBadges.ts`), och menyn jämför det med den senaste varans `createdAt`.
- Menyns egen bakgrund är breddbegränsad till samma `--content-max-width` som resten av appen (se 4b.12) med rundade överkanter, istället för att gå kant-till-kant över hela skärmen.
- **Bugghistoria:** `/dashboard` hade tidigare sin egen inbyggda bottenmeny (Reminders/History/Settings/+) som byggdes innan den delade menyn fanns. De krockade visuellt tills den gamla togs bort 2026-07-27 – se 4b.11 för var funktionerna hamnade istället.

### 4b.11 Hamburgermeny för allt som inte har en egen flik (byggd 2026-07-27, breddad till full åtkomst 2026-07-28)

Eftersom bottenmenyn nu bara visar 4–5 av alla appar (se 4b.10), måste hamburgermenyn täcka **allt** – inte bara det som saknar en egen flik.

- `components/HamburgerMenu.tsx`: en ☰-knapp längst till höger i sidhuvudet, öppnar en dropdown med **Reminders, Calendar, Shopping list, Wishlist, Chores, Training, School, Ideas & voting, Settings**, och **Admin** (endast om `session.user.email === ADMIN_EMAIL` – samma konstant som skyddar `/admin` själv, delad via `lib/adminConfig.ts`), plus **Sign out** längst ner.
- **"Family"-länken togs bort 2026-07-28** – den pekade på exakt samma sida som "Chores" (dubblett), och med Training/School som egna sektioner (se 4b.21) fanns inget kvar som motiverade ett separat "Family"-begrepp i menyn. Familjemedlemshantering (bjud in, lägg till barn) sker under Settings, se 4b.24.
- Placerad som en vanlig flex-sibling bredvid sidtiteln (`<h1 style="flex:1">`) i stället för en fristående `position:fixed`-knapp.
- Tillagd i sidhuvudet på: `/dashboard`, `/dashboard/family` (Chores), `/dashboard/training`, `/dashboard/school`, `/dashboard/family/shopping-list`, `/dashboard/wishlist`, `/dashboard/calendar`, `/dashboard/suggestions` – i praktiken alla huvudsidor. Djupare formulärsidor (skapa/redigera reminder, bjud in familjemedlem) har medvetet bara tillbaka-knapp.
- **Innan 2026-07-27:** `/admin` gick bara att nå genom att skriva URL:en direkt i webbläsaren – ingen länk fanns i appen.

### 4b.12 Mobil/webb-vy-växlare (byggd 2026-07-27)

En enkel lösning på att appens smala kolumn (480px) ser gles ut på en stor datorskärm, utan att bygga om varje sidas layout:

- En CSS-variabel, `--content-max-width` (`globals.css`), styr bredden på **alla** sidor. Ett `data-view="mobile"|"web"`-attribut på `<html>` växlar variabelns värde mellan `480px` (mobil, förvalt) och `1040px` (webb).
- Väljare under **Profile → Preferences → Display**: "📱 Mobile view" / "🖥️ Web view". Sparas per enhet i `localStorage` (`lib/viewMode.ts`). Ett litet script i `<head>` (`VIEW_MODE_INIT_SCRIPT`) sätter attributet innan sidan målas upp, så det inte blinkar till fel bredd vid laddning.
- **Viktigt att förstå gränsen för detta:** "Web view" gör den befintliga kolumnen bredare – det är fortsatt en enkolumns-layout, inte en omdesignad desktop-upplevelse med sidopanel eller grid. En riktig egen desktop-layout är ett separat, större projekt (se öppen fråga i `TODO.md` 4e/4f).

---

### 4b.13 Frivillig PIN-inloggning för vuxna (byggd 2026-07-27, kväll)

Utöver barnens PIN-inloggning kan en vuxen valfritt lägga till en egen 4-siffrig PIN som ett extra, snabbare sätt att växla profil på en delad familjeenhet – utan att det ersätter det riktiga lösenordet (eller Google-inloggningen).

- **Profile → Security → "PIN login":** sätt/ändra/stäng av en 4-siffrig PIN. Sparas i ett eget `User.pin`-fält, helt separat från `password` så det riktiga lösenordet aldrig påverkas.
- Ny NextAuth-provider `"pin"` (separat från `"credentials"`) – kollar `pin`-fältet för vuxna, `password`-fältet för barn (bakåtkompatibelt med befintliga barnprofiler).
- Familje-switchern (`/family?h=...`, numpad-skärmen) visar nu både barn och PIN-aktiverade vuxna i profilväljaren, vuxna märkta "Adult". Redirect efter inloggning kollar om profilen faktiskt är ett barn innan den skickar användaren till barnens sysslo-vy eller den vanliga dashboarden.
- `/api/profile` returnerar `hasPin` så profilsidan vet vad den ska visa.
- **Klicktestat skarpt 2026-07-27 (sen kväll):** satte en PIN, loggade in via familje-länken, bekräftade korrekt omdirigering till den vanliga dashboarden. Känt kosmetiskt fel: Security-sektionen kan visa "Change password" istället för "Signed in with Google" efter en PIN-inloggning – se `TODO.md` punkt 6.

---

### 4b.14 Kategorihantering, tight layout, optimistisk UI (byggd 2026-07-28)

Feedback: kategorierna på inköpslistan tog för mycket plats (egna färgade rutor per kategori), och listan kändes trög/fördröjd när man kryssade av eller lade till varor.

- **Layout ("Alt A"):** varorna ligger nu i **ett** enda kort; kategorin är bara en liten grå textrubrik ovanför sin grupp, inte en egen färgad box. Provade tre alternativ som bilder innan bygget (nuvarande rutor / detta / en helt flödande lista utan gruppering) – Mikael valde det här.
- **Kategorier är nu hushållets egna, inte en fast lista:** `ShoppingCategoryDef` (household-scoped, ersätter den fasta `ShoppingCategory`-enumen). Ett hushåll kan **lägga till** en kategori som saknas och **döpa om** befintliga via en "Manage categories"-panel, med upp/ner-pilar för ordning. De 8 ursprungliga kategorierna seedas automatiskt per hushåll (`slug` håller reda på vilken är vilken så nyckelords-gissningen fortsätter fungera efter en omdöpning).
- **Sortering:** varor sorteras alltid bokstavsordning (`localeCompare` med svensk locale, så å/ä/ö hamnar rätt) inom varje kategorigrupp.
- **Optimistisk UI:** lägga till/kryssa av/ta bort en vara uppdaterar listan **direkt** i gränssnittet – nätverksanropet sker i bakgrunden och rullas bara tillbaka om det faktiskt misslyckas. Tidigare väntade varje åtgärd på ett anrop och sedan en fullständig omhämtning av hela listan innan något syntes, vilket kändes trögt.
- **Avbockade varor rensas inte längre automatiskt** – se ändringen i 4b.8 ovan.
- **Databasändring:** `category`-enumfältet på `ShoppingListItem`/`ShoppingCategoryMemory` är kvar men markerat `Deprecated` i schemat (kod använder det inte längre) – en backfill-script (`scripts/backfill-shopping-categories.js`) migrerar befintlig data till de nya `ShoppingCategoryDef`-raderna. Se `OPERATIONS.md` §5 för körordning.

### 4b.15 Flera listor per hushåll, åtkomststyrning, notis/länk/bild på varor (byggd 2026-07-28)

Uppföljande beställning: både inköpslistan och önskelistan ska kunna vara **flera separata listor** (t.ex. "Veckohandling", "IKEA", "Julklappar till Ebba"), var och en synlig för antingen alla i familjen eller bara utvalda medlemmar. Samma mekanik återanvänds för båda funktionerna eftersom det som skiljer dem åt egentligen bara är vilka fält en vara har.

- **Ny modell `List`** (household-scoped): `kind` (SHOPPING/WISHLIST), `name`, `ownerId` (barnet en WISHLIST-lista tillhör; null för SHOPPING), `visibleToAll`, `shareToken` (den inloggningsfria dela-länken flyttade hit från `Household`, en per lista istället för en per hushåll), `createdBy`.
- **Åtkomstregler** (`lib/lists.ts`): en lista syns för (a) sin ägare (ett barn ser alltid sina egna önskelistor), (b) sin skapare, (c) OWNER/PARENT-roller (fullt föräldra-överinseende, oavsett listans egna inställningar), (d) alla om `visibleToAll = true`, eller (e) uttryckligen tillagda `ListMember`-rader. **Undantag för barnens integritet:** `visibleToAll` för en WISHLIST-lista betyder "synlig för alla vuxna", inte bokstavligen alla hushållsmedlemmar – ett barn ser fortfarande aldrig ett syskons önskelista av misstag.
- **Vem får ändra vem som ser en lista:** beslutat att bara **OWNER/PARENT** ska kunna ändra `visibleToAll`/medlemslistan (`canEditListAccess` i `lib/lists.ts`) – inte automatiskt den som skapade eller äger listan. Namnbyte är däremot öppet för skaparen också.
- **Ny standard-UI:** listväljare (chips) högst upp på både inköpslistan och önskelistan, "+ New list", och en expanderbar "Vem kan se den här listan"-panel (`components/ListAccessPanel.tsx`, delad komponent mellan de två sidorna).
- **Delning per lista:** dela-länken (`/shop/[token]`) pekar nu på en specifik `List` istället för hela hushållets inköpslista – olika listor kan delas separat, med separata token.
- **Varor kan nu ha notis, länk och bild:** `note`, `url`, `imageUrl` tillagda på `ShoppingListItem` (fanns redan på `WishlistItem` sedan 4b.9). Visas som liten grå text, en länk-ikon respektive en 32px miniatyrbild i varje rad. **Beslut:** bara bild-URL i v1, ingen riktig filuppladdning (skulle krävt att sätta upp Vercel Blob eller liknande lagring).
- **Databasändring:** additiv (nya tabeller `lists`/`list_members`, nya nullable kolumner `listId`/`note`/`url`/`imageUrl`). `Household.shoppingListShareToken` och `WishlistItem.childId` finns kvar oanvända/legacy av samma skäl som `category`-fältet i 4b.14 – enklare och säkrare än att göra en andra destruktiv migrering. Backfill-script: `scripts/backfill-lists.js`, seedar en standardlista per hushåll/barn och flyttar över befintliga varor. Se `OPERATIONS.md` §5.

### 4b.16 Fem "quick wins" från Best4Family-genomgången (byggda 2026-07-28)

Efter konkurrentanalysen av Best4Family (`COMPETITOR_ANALYSIS_BEST4FAMILY.md`, se `TODO.md` punkt 9) byggdes fem lågkomplexa kandidater i en omgång. Ingen databasändring i någon av dem.

- **Sekretess-chip på reminders:** `visibility`-fältet (PRIVATE/HOUSEHOLD/PARENTS, se 4b.5) fanns redan i schemat men syntes aldrig för användaren. `dashboard/page.tsx` visar nu en liten 🔒 Private / 👪 Parents-tagg på reminder-raden, bredvid de befintliga kategori-/ägar-taggarna. Bara synlig när hushållet har fler än en medlem (annars är allt trivialt privat och taggen vore bara brus); HOUSEHOLD (standardläget i ett delat hushåll) får medvetet ingen tagg.
- **Dataexport (portabilitetsrätt):** `GET /api/profile/export` – laddar ner en JSON-fil med kontots egna data (profil, reminders, tillagda inköps-/önskelistevaror, hushållsmedlemskap). Exkluderar medvetet andra medlemmars personuppgifter. Knapp "Export my data" i Profile → Security, ovanför "Delete account" (som fortfarande bara är en UI-shell utan fungerande radering, se 4b.17 nedan/`TODO.md`).
- **Broadcast-notis till familjen:** `POST /api/family/broadcast`, bara OWNER/PARENT. Mailar alla vuxna hushållsmedlemmar utom avsändaren själv via befintlig Resend-infra (ny mall `sendBroadcastEmail` i `email.ts`) – ingen ny notiskanal byggd. Barnprofiler exkluderas medvetet (har ofta en alias-email ingen läser dagligen, se 4b.2). UI: "📣 Send a family update" i Profile → Household, bara synlig för OWNER/PARENT och bara om hushållet har fler än en medlem.
- **PIN/Google-bugg fixad:** Profile → Security visade tidigare "Change password" istället för "Signed in with Google" efter en PIN-inloggning på ett Google-länkat konto (kosmetiskt fel, känt sedan 4b.13). Orsak: sidan avgjorde detta utifrån `session.user.image`, som bara är satt på en session som kom direkt från Google OAuth-flödet. Fix: `/api/profile` returnerar nu `hasPassword`, och sidan avgör istället utifrån om kontot saknar lösenord (sant för alla Google-skapade konton, se `auth.ts`s `signIn`-callback).
- **"Vad händer närmast"-sammanfattning – redan löst, inget byggt:** Best4Family-analysen föreslog en kompakt sammanfattning av kommande händelser överst på dashboarden. Vid genomgång visade det sig att dashboarden redan har detta: "IQ Spotlight · Up next" (närmaste kommande reminder) + "Needs your attention" (allt inom 7 dagar, upp till 3 rader). Ingen kod skriven, för att undvika en duplicerad tredje sektion.

**Kvarstår (se `TODO.md` punkt 10):** klicktesta alla fem skarpt.

### 4b.17 Kända, ej byggda gap efter Best4Family-genomgången

Dokumenterat här så det inte glöms bort – dessa är medvetet **inte** byggda ännu (se `TODO.md` punkt 9/12/20 och `ROADMAP.md` för prioritering):
- **Delete account-knappen i Profile → Security är bara en UI-shell** – "Yes, delete"-knappen har inget fungerande anrop bakom sig idag. Självbetjänings-radering är ett kvarstående P1-gap inför bred lansering.
- **Riktig Privacy Policy-sida** – uppdaterat 2026-07-28: **strukturen finns nu** (`/privacy`, se 4b.28), men innehållet är fortfarande inte klart (7 punkter kvar på sidans egen checklista, bl.a. deklarerad minimiålder/föräldrasamtycke).
- Gästprofiler utan inloggning, Belöningar kopplat till Sysslor (öppen fråga: poäng/stjärnor eller riktiga belöningar, se `TODO.md` 19d/20), inkommande ICS-prenumeration för Training (se `TODO.md` 19h/20) – se `TODO.md` punkt 9/12 för full lista.

### 4b.19 Training-bokningar, School-kategori, utgående kalendersynk (byggd 2026-07-28, natt – produktriktning)

Uppföljning direkt efter 4b.18: Mikael gick igenom marknadsundersökningen och gav riktning för tre nya bitar i samma runda.

**Training (bokningar per barn):**
- Ny `ReminderCategory`-värde `TRAINING` – återanvänder exakt samma `Reminder`-fält som Chores (`assignedTo`, `choreRecurrenceDays`, `recurrence`), men **utan** godkännande-/completion-flödet (ingen "klar → godkänn"-status, det är bara ett schemalagt bokningstillfälle).
- `GET/POST /api/family/chores` generaliserad till `?category=CHORE|TRAINING` (default CHORE) – samma endpoint, samma behörighetsmodell, `requiresApproval` tvingas alltid `false` för TRAINING oavsett vem som skapar den.
- `dashboard/family/new/page.tsx` – lagt till en Chore/Training-toggle högst upp; namnfält, förslags-chips ("Karate", "Football practice", …) och sparaknapp byter text beroende på val. Godkännande-togglen döljs helt för Training (inte ett relevant koncept). Sparas till `/dashboard/calendar` istället för `/dashboard/family` efter en Training (dit reminders/chores-sammanfattningen inte visar dem).
- `dashboard/family/page.tsx` – ny "⚽ Add training"-knapp bredvid "Add chore".
- **Extern kalenderprenumeration per barn (klubbens/skolans .ics-länk)** – rekommenderad riktning (se `ROADMAP.md`), **inte byggd än**. Kräver en ny modell (`CalendarSubscription` el. liknande) + server-side hämtning/parsning av en extern .ics-URL (CORS gör att detta måste ske server-side) + en periodisk uppdatering. Nästa steg, egen omgång.

**School (kommande prov/läxor) — 4b.20, rättad efter Mikaels korrigering samma kväll:**
- Första versionen lät School gå genom det vanliga Reminders-flödet (kategori-väljare i `/dashboard/new`). Mikael korrigerade direkt: *"NEj school borde vara ett eget avsnitt. Missuppfattning."* — School ska vara en **egen sektion**, precis som Training/Chores, inte en kategori bland vanliga reminders. Reverterat i sin helhet: `dashboard/new/page.tsx`, `dashboard/page.tsx`, `dashboard/[id]/page.tsx`, `dashboard/[id]/edit/page.tsx`, `api/reminders/route.ts`, `api/reminders/[id]/route.ts` och `lib/email.ts` har alla fått SCHOOL borttaget igen (men `api/reminders` GET behåller ändå `notIn: ["CHORE","TRAINING","SCHOOL"]` som skyddsnät, oavsett hur ett School-item skapades).
- `GET/POST /api/family/chores` generaliserad ytterligare till `?category=CHORE|TRAINING|SCHOOL` (samma endpoint, samma behörighetsmodell som Training – `requiresApproval` tvingas `false`).
- **Barnens självbetjäning** (`dashboard/family/child/page.tsx`): egen "📚 School"-sektion, separat kort från Chores, med eget "+ Add a test or homework"-formulär (namn, valfritt datum, valfri anteckning) och en radera-knapp (×) per item. Datan hämtas via samma `/api/family/chores?category=SCHOOL` – servern filtrerar redan automatiskt på `assignedTo = inloggat barn` (samma `isChild`-check som redan fanns för Chores/Training), så **ett barn ser bara sina egna skoluppgifter** utan någon extra kod.
- **Föräldravy** – ny sida `/dashboard/school`, länkad från hamburgermenyn ("📚 School", mellan Chores och Family). Listar alla barns skoluppgifter grupperade per barn (samma endpoint, men utan `isChild`-filtret returnerar den hela hushållets items med `assignedUser` ifyllt), med ett formulär där föräldern väljer barn + namn + datum + anteckning.
- Synkar automatiskt till kalendern och till det utgående ICS-flödet (se nedan) precis som Training, eftersom School-items alltid skapas med `visibility: HOUSEHOLD`.

**Kalendervyn (`dashboard/calendar/page.tsx`):**
- Hämtar nu trainings (`/api/family/chores?category=TRAINING`) och school-items (`/api/family/chores?category=SCHOOL`) separat, utöver reminders och chores.
- Nya färger: Training = koral `#D85A30`, School = indigo `#3730A3` (samma som visades i mockupen till Mikael 2026-07-28). Klick på ett School-item länkar till `/dashboard/school`, klick på Chore/Training till `/dashboard/family`.

**Utgående ICS-kalendersynk ("synka med min privata kalender"):**
- Mikael ville kunna se allt i sin egen Google/Outlook-kalender. Löst utan OAuth: ett personligt, hemligt **utgående** ICS-flöde (`User.calendarFeedToken`, samma förtroendemodell som `List.shareToken`) som han lägger till i valfri kalenderapp via "Prenumerera på kalender > Från URL".
- `GET /api/calendar/feed/[token].ics` – publik (ingen inloggning, token är auktoriseringen), återanvänder **exakt samma synlighetsregel** som `GET /api/reminders` (HOUSEHOLD/PARENTS-delade + egna PRIVATE) men **utan** att exkludera CHORE/TRAINING/SCHOOL – eftersom de redan alltid skapas med `visibility: HOUSEHOLD` täcks de automatiskt av samma regel, ingen separat fråga behövdes.
- `lib/ics.ts` – egen, minimal RFC5545-writer (inga externa beroenden/kostnader). Bara heldags-VEVENT (appen är redan dag-granulär överallt, se `lib/recurrence.ts`), fönster ‑90/+400 dagar.
- `GET/POST /api/profile/calendar-feed` – hämtar/genererar (GET) respektive roterar (POST) token.
- Profile → ny "Calendar sync"-sektion: "Get my calendar link"-knapp, kopiera-länk, "Generate a new link" för att återkalla en tidigare delad länk.
- **Gratis, ingen Google/Microsoft-inloggning krävs** – matchar Mikaels "måste vara gratis"-linje för hela den här beställningen. En riktig **två-vägs** synk (skapa/redigera direkt i Google Calendar och få det tillbaka hit) skulle kräva OAuth – se `ROADMAP.md`-avsnittet om kostnad.

**Databasändring:** `TRAINING`/`SCHOOL` tillagda i `ReminderCategory`-enumen, `User.calendarFeedToken` (nullable, unik) tillagd. Additivt, ingen backfill behövs. `npx prisma generate && npx prisma db push` körda lokalt, kod deployad till Vercel och verifierad av Mikael (2026-07-28).

**Sidofynd (inte relaterat till denna beställning):** `tsc --noEmit` flaggar ett förbefintligt typfel i `api/reminders/[id]/route.ts` (PATCH-handlern, `householdId`-hanteringen) som **inte** orsakades av dagens ändringar (verifierat med `git diff` – den enda ändringen i den filen är kategori-enumen). Inte akut, inte fixat i denna omgång, men värt att känna till.

### 4b.18 "Ideas & voting" – delad förbättringsförslag-/funktionssektion (byggd 2026-07-28, natt)

Efter en EU-marknadsundersökning (`MARKET_RESEARCH_EU.md`) som visade att flera konkurrenter (Tribe Family, Family Folder) redan har publika röstningsbaserade förslagssidor, och en avstämning med Mikael om omfattning, byggdes en egen sektion för att samla förbättringsförslag och nya funktionsidéer, med röstning.

- **Global över alla kunder, inte hushålls-scopad** – till skillnad från varje annan familjefunktion i appen ser **alla inloggade användare, oavsett hushåll,** samma delade lista och röstar på samma förslag. Medvetet beslut (Mikael, 2026-07-28): detta ger en samlad bild av vad *alla* kunder vill ha, inte bara en enskild familj.
- **Kräver inloggning** (beslut 2026-07-28) – ingen publik/utloggad åtkomst i v1, till skillnad från t.ex. Tribe Familys publika `/roadmap`-sida. Kan omprövas senare om vi vill använda det i marknadsföringssyfte.
- **Två kategorier:** Improvement (🔧, en tweak på något som redan finns) / New feature (💡, något som inte finns än).
- **Statusflöde:** Open → Planned → In progress → Done/Declined. Bara admin (`ADMIN_EMAIL`) kan ändra status – det är triage-/roadmap-steget. Författaren kan redigera titel/beskrivning själv, men bara medan status fortfarande är Open (annars kan ordalydelsen ändras under någon som redan röstat).
- **Röstning:** en röst per (förslag, användare), togglingsbar (samma mönster som Canny/GitHub-reaktioner). Den som postar ett förslag röstar automatiskt på sitt eget (gör räknaren icke-noll direkt och matchar hur andra röstningssidor fungerar).
- **Inte Pro/trial-spärrat** – till skillnad från Sysslor/Shopping/Wishlist är detta produktfeedback-infrastruktur för hela kundbasen, inte en familje-premium-funktion.
- **UI:** ny sida `/dashboard/suggestions`, länkad från hamburgermenyn ("💡 Ideas & voting", mellan Family och Settings). Kategori-filter (All/Improvements/New features), "+ Suggest an idea"-formulär, kort per förslag med röstknapp (▲ + antal, fylld när man själv röstat), statusbricka, och en hopfällbar "Show shipped & declined"-sektion så att aktiva förslag inte drunknar i historik.
- **Databasändring:** nya modeller `Suggestion` (id, userId, title, description?, category, status, timestamps) och `SuggestionVote` (unik per suggestionId+userId), plus två nya enums (`SuggestionCategory`, `SuggestionStatus`). Additiv migrering, ingen påverkan på befintliga tabeller. **Kräver `npx prisma generate && npx prisma db push` lokalt** innan det fungerar i produktion – samma kända sandbox-begränsning (`binaries.prisma.sh` blockerad) som tidigare ändringar denna sommar, se `TODO.md`.
- **Inte klicktestat än** – kodgranskat, `tsc --noEmit` kört (rent förutom de förväntade Prisma-client-felen som försvinner efter `prisma generate` lokalt).

### 4b.25 Kalender: typfilter, månadsöversikt, "+"-guide (byggd 2026-07-28)

Del av en större UX-genomgång (se `TODO.md` punkt 19/20). Tre separata önskemål mot samma sida:

- **Typfilter + färglegend** högst upp: klickbara chips per typ (🔔 Reminders/🧹 Chores/⚽ Training/📚 School), av/på styr både månadsgriden och listorna under. Reminders-chippen använder en neutral färg (`#5A6080`) eftersom reminders i sig har flera kategorifärger – legenden representerar "reminders som typ", inte en specifik kategori.
- **"Everything this month"-lista** under den befintliga "vald dag"-panelen: alla synliga (filtrerade) poster för hela den innevarande månaden, grupperade per dag, kronologiskt. Löser att griden ensam kändes för statisk för att faktiskt bläddra i.
- **Flytande "+"-knapp** (samma runda stil som Reminders): öppnar en 2-stegs guide (bottom sheet) – välj typ, sedan datum – som sedan skickar dig vidare till respektive befintliga skapa-sida med datumet förifyllt via en ny `?date=`-query-parameter. `/dashboard/new`, `/dashboard/family/new` och `/dashboard/school` läser alla nu den parametern (School öppnar dessutom sitt formulär automatiskt om parametern finns).
- Ingen ny datamodell – ren vy-/UI-förändring ovanpå redan existerande data, samma princip som resten av kalendern (se 4b.19).

### 4b.26 Chores städad + Training egen sektion (byggd 2026-07-28)

- **Chores-sidan** (`dashboard/family/page.tsx`) städad: barnens inloggningslänk (delningslänk, `<ShareLink>`-komponenten) borttagen – barnhantering sker nu enbart under Settings (se 4b.29). "Add chore" är nu samma flytande runda "+"-knapp som resten av appen istället för en pill-knapp med text. "Done over time"-kortet har fått ett fjärde fönster, **This year** (`/api/family/stats` räknar nu även från 1 januari, UTC), och kortet är en 2×2-grid istället för 3 kolumner.
- **Training fick en egen sida, `/dashboard/training`** – mirror av School-mönstret (4b.19): listar alla barns träningar grupperade per barn, med schemat formaterat läsbart från `choreRecurrenceDays`/`recurrence` (t.ex. "Mon, Wed, Fri"). "Add training"-knappen på Chores-sidan togs bort; skapandet går fortfarande genom det befintliga `/dashboard/family/new?type=training`-formuläret (ingen ny formulärlogik behövdes, bara en ny listvy och nya länkmål). Kalenderns klick-igenom och skapa-formulärets redirect efter spara pekar nu på `/dashboard/training` i stället för `/dashboard/family`/`/dashboard/calendar`.
- **Verifierat, inget att bygga:** `/api/family/chores` POST krävde redan `assignedTo` för vuxna (`"assignedTo required"` om det saknas) och self-assignar alltid barn till sig själva oavsett vad klienten skickar – "alla aktiviteter tillhör någon" var redan garanterat på serversidan för både Chores/Training/School.

### 4b.27 Inköpslista: add-sheet, streckkodsskanning, butiksläge (byggd 2026-07-28)

- **"Add an item"-formuläret** (alltid synligt, med namn/kvantitet/anteckning/länk/bild) ersatt av en flytande "+"-knapp som öppnar ett bottom-sheet med fyra flikar: **Recent** (samma one-tap-chips som fanns i 4b.16-ish/4i), **Categories** (samma katalog-browse), **New** (det gamla formuläret, nu inuti sheeten), **Scan** (ny).
- **Streckkodsskanning:** webbläsarens inbyggda `BarcodeDetector`-API (Chrome/Edge, inget nytt npm-beroende, ingen kostnad) läser EAN-13/EAN-8/UPC-A/UPC-E, slår sedan upp produktnamnet mot **Open Food Facts** (gratis, publikt API, ingen nyckel) och lägger till direkt via samma `quickAdd`-funktion som Recent/Categories redan använde. Tydligt fallback-meddelande i webbläsare utan stöd (Safari/Firefox idag).
- **Butiksläge:** en fullskärms, storstilad, en-handsvänlig vy (`storeMode`-state) – bockar av direkt i listan, "Done" för att gå ur.
- **Delningslänken dold** (omsvängning från 4i): dela-ikonen och "Shared with a link"-bannern borttagna ur UI:t. Token-infrastrukturen (`shareList`/`turnOffShare`, `/api/family/lists/[id]/share`) rörd inte alls, bara gömd.
- **Medvetet inte byggd:** receptimport via foto (OCR). Kräver ett nytt npm-beroende (Tesseract.js, till skillnad från streckkodsskanningen som bara använder webbläsarens inbyggda API) och kan inte testas meningsfullt utan en riktig telefon och riktiga receptfoton. Nästa steg om det ska byggas: lägg till paketet i `package.json`, `npm install` lokalt, egen kodrunda.

### 4b.28 Privacy Policy-sida – strukturell scaffold (byggd 2026-07-28)

- Ny sida `/privacy` (`app/src/app/privacy/page.tsx`), länkad från Register och `/features`. Tolv sektioner enligt GDPR-relevant standardstruktur (vilka vi är, vad vi samlar in, varför, barn/samtycke, var data lagras, underleverantörer, lagringstid, dina rättigheter, cookies, säkerhet, ändringar, kontakt).
- **Bara struktur, inte innehåll:** allt som redan går att skriva är ifyllt (t.ex. Supabase-region `eu-central-1`/Frankfurt, den redan byggda dataexporten). Allt som kräver ett beslut eller en riktig uppgift är markerat med en gul "Needs a decision"-ruta direkt i UI:t, plus en samlad checklista längst ner på sidan: juridisk enhet (namn/org.nr/adress), minimiålder för barnprofiler + samtycke (öppet beslut, se `TODO.md` Körordning steg 3), Vercels/Resends DPA-status, datalagringstid efter kontoradering, självbetjänings-radering (inte byggd), riktig kontaktadress.
- **Inte en publicerad policy** – ska inte behandlas som juridiskt gällande text förrän checklistan är tom och en människa (helst med juridisk input) läst igenom slutresultatet.

### 4b.29 Familjemedlemmar & kontosammanslagning under Settings (2026-07-28)

- **Fynd som ändrade scopet på en tidigare planerad, större funktion:** kontosammanslagning (Google + lösenord, samma email) är **redan till stor del byggd**, bara aldrig synlig som en egen funktion. `auth.ts`s Google-`signIn`-callback slår upp befintlig `User` på email innan den skapar något nytt – om ett lösenordskonto redan har den emailen återanvänds samma rad, Google blir bara ett extra sätt att logga in på (ingen dubblett skapas). Och `autoJoinPendingInvite` (körs vid både Google- och lösenordsinloggning) implementerar redan "flytta allt"-varianten av sammanslagning: `// Remove from any existing household` följt av att gå med i den nya, byggd ursprungligen för hushållsinbjudningar men fungerar identiskt för det här syftet.
- **Det som fortfarande saknas:** en bekräftelseskärm innan bytet sker – idag händer det tyst vid inloggning/inbjudan-accept. Medvetet **inte** byggt den här omgången: att pausa mitt i NextAuths `signIn`-callback och vänta på ett användarsvar kräver en omdirigerings-baserad tvåstegsdans, och `auth.ts` har en dokumenterad historik av subtila buggar (PIN-redirect, Google-detection, admin-godkännande) – bör byggas i en egen, fokuserad omgång med riktig klicktestning, inte pressas in blint.
- **Litet, säkert genomfört:** `/api/household/invite` returnerar nu `existingUser: true/false`, och Profile-sidans inbjudningsflöde visar en tydlig varning om mottagaren redan har ett konto ("they already have an account. Accepting will move them out of their current household into yours") – ingen överraskning senare.
- **Self-service Google-koppling behövde ingen ny knapp** – att logga in med Google på ett konto vars email redan finns som ett lösenordskonto kopplar redan ihop dem automatiskt (se fyndet ovan). En tydlig "Link your Google account"-knapp i Profile är en ren UI-sockerbit ovanpå något som redan fungerar, inte byggd än.
- **Multi-family (en person i två hushåll samtidigt) – beslut: bara förbereda datamodellen, inte bygga UI nu.** Schemat tillåter det redan tekniskt (`HouseholdMember`-jointabellen har ingen spärr mot flera hushåll per user), men all applikationslogik antar idag ett hushåll per user. Krav antecknade för en framtida byggomgång (separerade föräldrar-scenariot): tvingat val av vilket hushåll varje ny post hör till vid skapande om en person tillhör två, ingen bulk-migrering av gamla poster (bara manuell per-post-ändring).

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
`id, email, password?, pin? (tillagd 2026-07-27, se 4b.13), name?, emailVerified?, phone?, preferredCurrency, timezone, isChildProfile, calendarFeedToken? (tillagd 2026-07-28, se 4b.19)`

**Reminder**
`id, userId, householdId?, name, category, date, recurrence, amount?, currency, note?, reminderDaysBefore, isActive, lastSentAt?` + Pro-fält: `assignedTo, fallbackTo, visibility, handoverState, handoverTo, handoverInitiatedAt, urgencyLevel` + Chore-fält: `requiresApproval, choreRecurrenceDays`

**Household / HouseholdMember / HouseholdInvite**
Hushåll, medlemskap med roll (OWNER/PARENT/ADULT/CHILD/MEMBER), inbjudningar med token + utgångsdatum. `Household.shoppingListShareToken?` *(tillagd 2026-07-27, deprecated 2026-07-28)* – ersatt av `List.shareToken` (en token per lista istället för en per hushåll), se 4b.15. Fältet finns kvar oanvänt i schemat.

**ChoreCompletion**
`id, reminderId, childId, weekStart, status (DONE/PENDING_APPROVAL/APPROVED), approvedBy?, approvedAt?`

**FamilyTrial**
`id, householdId, startedAt, expiresAt, childId, createdBy`

**ReminderLog**
`id, reminderId, sentAt, type`

**PasswordResetToken** *(tillagd 2026-07-27)*
`id, userId, token, expiresAt, usedAt?, createdAt` – engångstoken för glömt lösenord-flödet, 1 timmes giltighet

**ShoppingListItem** *(tillagd 2026-07-27, `category`-fält tillagt 2026-07-27, uppdaterad 2026-07-28)*
`id, householdId, listId, name, quantity?, note?, url?, imageUrl?, categoryId?, isPurchased, addedBy, purchasedBy?, purchasedAt?` – vara på en namngiven inköpslista (`List`, kind SHOPPING), se 4b.8/4b.14/4b.15. `category` (gamla `ShoppingCategory`-enumen) finns kvar i schemat men är **deprecated/oanvänd** – ersatt av `categoryId` → `ShoppingCategoryDef`.

**ShoppingCategoryDef** *(tillagd 2026-07-28, ersätter den fasta `ShoppingCategory`-enumen)*
`id, householdId, slug?, label, icon, sortOrder` – hushållets egna, namnbara/omdöpbara kategorier. `slug` identifierar de 8 standardkategorierna för nyckelords-gissning; egna tillagda kategorier har `slug = null`. Se 4b.14.

**ShoppingCategoryMemory** *(tillagd 2026-07-27, uppdaterad 2026-07-28)*
`id, householdId, itemName, categoryId?` – unikt per hushåll+varunamn, kommer ihåg senaste manuella kategorival så samma vara auto-sorteras rätt nästa gång, se 4b.8/4b.14. (`category`-enumfältet finns kvar men är deprecated, som ovan.)

**List** *(tillagd 2026-07-28)*
`id, householdId, kind (SHOPPING/WISHLIST), name, ownerId? (barnet en WISHLIST-lista tillhör), visibleToAll, shareToken? (unik, SHOPPING-listor), createdBy` – en namngiven, delbar lista; ett hushåll/barn kan ha flera. Se 4b.15 för åtkomstreglerna.

**ListMember** *(tillagd 2026-07-28)*
`id, listId, userId` – uttryckliga medlemmar för en lista där `visibleToAll = false`. Unikt per listId+userId.

**WishlistItem** *(tillagd 2026-07-27, uppdaterad 2026-07-28)*
`id, householdId, childId, listId, addedBy, name, url?, price?, currency?, imageUrl?, note?, status (WANTED/RESERVED/PURCHASED), reservedBy?, reservedAt?, purchasedBy?, purchasedAt?` – vara på ett barns namngivna önskelista (`List`, kind WISHLIST, kan vara flera per barn sedan 4b.15), se 4b.9. **Viktigt:** `status`-fältet och relaterade fält exponeras aldrig till det ägande barnet via API:et – se 4b.9.

**Suggestion** *(tillagd 2026-07-28, se 4b.18)*
`id, userId, title, description?, category (IMPROVEMENT/NEW_FEATURE), status (OPEN/PLANNED/IN_PROGRESS/DONE/DECLINED), createdAt, updatedAt` – **inte** hushålls-scopad, till skillnad från alla andra modeller i detta schema. Ett förslag/förbättringsönskemål, synligt för alla inloggade kunder.

**SuggestionVote** *(tillagd 2026-07-28, se 4b.18)*
`id, suggestionId, userId, createdAt` – en röst per (förslag, användare), unikt constraint på `[suggestionId, userId]`.

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
