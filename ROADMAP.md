# Roadmap – Reminder for Simplicity
**Uppdaterad igen:** 2026-07-28 (natt) – EU-marknadsundersökning genomförd (`MARKET_RESEARCH_EU.md`), ny delad "Ideas & voting"-sektion byggd (`/dashboard/suggestions`, se `PRODUCT_SPEC.md` 4b.18), och en samlad USP-/prioriteringssektion tillagd nedan inför kommande användartester.
**Senast uppdaterad:** 2026-07-27 kväll (hamburgermeny + mobil/webb-vy-växlare tillagda, ovanpå dagens tidigare inköpslista/önskelista/bottenmeny-arbete)
**Uppdaterad igen:** 2026-07-27 sen kväll – riktig email för barnprofiler + frivillig PIN-inloggning för vuxna tillagd under Fas 1.5; delningslänk för inköpslistan klicktestad skarpt.
**Uppdaterad igen:** 2026-07-28 – kategorihantering/tight layout/optimistisk UI, och flera listor per hushåll med åtkomststyrning, tillagda under Fas 1.5. "Flera separata listor per hushåll", som tidigare stod som medvetet inte byggd (se `TODO.md` 4i), är nu klar.
**Uppdaterad igen:** 2026-07-28 – kandidatfunktioner tillagda under Fas 1.5/2/3/Parkerat efter en konkurrentanalys av Best4Family (se `COMPETITOR_ANALYSIS_BEST4FAMILY.md` och `TODO.md` punkt 9). Inget av detta är byggt eller bestämt än – markerat `(Best4Family-analys 2026-07-28)` nedan.
**Uppdaterad igen:** 2026-07-28 – tre av kandidaterna avbockade: sekretess-chip, dataexport och broadcast-notis byggda, "vad händer närmast" visade sig redan finnas (IQ Spotlight). Se `TODO.md` punkt 10.
**Uppdaterad igen:** 2026-07-28 – **Kalendervy byggd** (fjärde bottenmeny-flik, ovanpå Reminders/Shopping list/Wishlist), commit `0a3032e`. Läsvy på data som redan fanns (`Reminder.date`/`recurrence`, sysslornas datum). Inte pushat/klicktestat än, se `TEST_VERIFICATION.md`. Extern synk (Google/Apple) tas som ett separat, senare steg – se Fas 3.
**Uppdaterad igen:** 2026-07-28 (natt) – **Admin-godkännande av nya konton byggt**, tillagd under Fas 1.5. Nya toppnivå-signups (e-post/lösenord + första Google-inloggning) kan inte logga in förrän du godkänner dem i `/admin`. Kräver `npx prisma db push`, inte klicktestat än. Se `TODO.md` punkt 16.

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
- [x] **Riktig email + frivillig PIN-inloggning (2026-07-27, kväll):** barnprofiler kräver nu en riktig email vid skapande (ingen påhittad intern adress längre). Vuxna kan valfritt lägga till en 4-siffrig PIN (Profile → Security) som ett extra sätt att växla profil på en delad familjeenhet, utan att det ersätter det riktiga lösenordet. Familje-switchern visar nu både barn och PIN-aktiverade vuxna. Klicktestat skarpt 2026-07-27 sen kväll – se `TODO.md` 4j.
- [x] **Kategorihantering, tight layout, optimistisk UI (2026-07-28):** `ShoppingCategoryDef` ersätter den fasta kategori-enumen (lägg till/döp om/omordna per hushåll), ett-kort-layout istället för färgade kategorirutor, bokstavsordning inom grupp, optimistisk UI (ingen väntan på nätverksanrop innan listan uppdateras), automatisk 24h-rensning av köpta varor borttagen. Se `PRODUCT_SPEC.md` 4b.14, `TODO.md` 4k.
- [x] **Flera listor per hushåll + åtkomststyrning (2026-07-28):** ny `List`/`ListMember`-modell delad mellan inköpslistan och önskelistan – valfritt antal namngivna listor, var och en synlig för alla eller bara utvalda familjemedlemmar (OWNER/PARENT styr det). Dela-länken flyttad till per-lista. Varor kan nu ha notis, länk och bild-URL. Se `PRODUCT_SPEC.md` 4b.15, `TODO.md` 4l.
- [x] **"Ideas & voting" – delad förbättringsförslag-/röstningssektion (2026-07-28, natt):** ny sida `/dashboard/suggestions`, länkad från hamburgermenyn. Global över alla kunder (inte hushålls-scopad), kräver inloggning, kategorier Improvement/New feature, admin-styrt statusflöde (Open→Planned→In progress→Done/Declined), en röst per person och förslag. Byggd efter `MARKET_RESEARCH_EU.md` som visade att flera konkurrenter redan har publika röstningssidor. Se `PRODUCT_SPEC.md` 4b.18. **Kräver ny `npx prisma db push`** (nya modeller `Suggestion`/`SuggestionVote`), inte klicktestat än.
- [x] **Admin-godkännande av nya konton (2026-07-28, natt):** `User.approved`/`approvedAt`. Nya e-post/lösenord-registreringar och första Google-inloggningar skapas som `approved:false` och kan inte logga in (specifikt felmeddelande på `/login` och familje-PIN-skärmen) förrän du godkänner dem i `/admin` → ny "Pending approval"-flik. Godkännande-mail skickas automatiskt. Barnprofiler och redan-godkända hushållsmedlemmar berörs inte. **Kräver ny `npx prisma db push`**, inte klicktestat än. Se `TODO.md` punkt 16.

**Detta bör dokumenteras formellt i PRODUCT_SPEC.md** – se uppdaterad version (4b.8–4b.10).

### Kandidater – innan bred lansering/betalande användare (Best4Family-analys 2026-07-28)
Identifierade som gap mot Best4Family, se `COMPETITOR_ANALYSIS_BEST4FAMILY.md` §5. Inget byggt än.
- [ ] Riktig Privacy Policy-sida (finns inte idag)
- [ ] Deklarerad minimiålder + föräldrasamtycke för barnprofiler
- [ ] Självbetjänings-"radera mitt konto permanent" i UI (Profile → Security)
- [ ] Gästprofiler utan inloggning (mor-/farföräldrar synliga i planeringen utan konto)
- [x] **Synlig sekretess-"chip"** (Privat/Hushåll/Föräldrar) på reminders – `visibility`-fältet fanns redan i schemat (4b.5). **Byggt 2026-07-28**, se `TODO.md` punkt 10.

---

## USP:ar och prioritet inför användartester (2026-07-28)

Sammanställt efter konkurrentanalysen av Best4Family (`COMPETITOR_ANALYSIS_BEST4FAMILY.md`) och en bredare EU-marknadsundersökning (`MARKET_RESEARCH_EU.md`). Syfte: samla **vad som redan är en verklig USP**, och **vad som är billigt att stärka innan betaanvändarna kommer**, på ett ställe.

### Våra tre starkaste USP:ar just nu
1. **Smal scope i en marknad som belönar det.** Både Best4Family-analysen och den bredare marknadsundersökningen bekräftar oberoende av varandra att "en sak riktigt bra" slår "18 moduler halvbra". Vi har redan disciplinen (Reminders/Shopping/Wishlist/Chores/Calendar, inget mer) – håll den.
2. **En kombination ingen konkurrent renodlat äger.** Marknaden delar sig i nischer (kalender-först/dokument-först/sysslor-först/mental load-först/co-parenting-först) – vår mix av påminnelser + delad inköpslista + barnens integritetssäkra önskelista + sysslor + kalender träffar mitt i utan att vara någon av dessa fullt ut.
3. **Redan starkare barn-integritet än vad vi kan bekräfta hos någon konkurrent:** server-side strippning av önskelistans köpstatus (4b.9), en integritetslucka vi själva hittade och fixade i `visibleToAll`-logiken (4b.15). Detta är ett konkret, verifierbart löfte vi kan skriva rakt ut i en framtida Privacy Policy – inget att bygga, bara att kommunicera.

### Snabba förstärkningar innan användartester (billigt, stärker befintliga USP:ar)
- **Deklarera var data lagras (Supabase-region)** – kostar inget att skriva, men är nu även ett marknadsföringsargument i EU (se `MARKET_RESEARCH_EU.md` §2 punkt 3), inte bara ett juridiskt P0.
- **Riktig Privacy Policy-sida** (redan P0, se `COMPETITOR_ANALYSIS_BEST4FAMILY.md` §5) – dubbel funktion nu: juridiskt krav **och** konkurrensargument mot USA-hostade appar.
- **Belöningar kopplat till Sysslor** (redan P1) – marknadsundersökningen visar att detta är den *enda* funktionen i hela jämförelsen som en dedikerad konkurrent (OurHome) byggt en hel produkt runt, vilket bekräftar att den är värd att prioritera högt, inte bara "trevlig att ha".
- **"Ideas & voting"-sektionen** (byggd denna session, se ovan) – ger oss nu ett sätt att **mäta** vilka av alla dessa idéer riktiga betaanvändare faktiskt bryr sig om, istället för att gissa. Rekommendation: introducera den för de första 10 betaanvändarna som en av de första sakerna de ser, så röstningsdata finns innan större prioriteringsbeslut tas.

### Medvetet inte att bygga innan användartester
Reseplanerare, Recept, Restauranger, Städplan, Omröstningar, Beslutshjul, Bill Split, Spelverktyg, fria Anteckningar, generella Uppgifter för vuxna – bekräftat lågt värde av **två oberoende källor** nu (Best4Family-analysen och den bredare marknadsundersökningen), inte bara en åsikt. Se P3-listan i `COMPETITOR_ANALYSIS_BEST4FAMILY.md` §6.

---

## Produktriktning – nästa runda (2026-07-28, sen kväll, efter genomgång med Mikael)

Mikael gick igenom marknadsundersökningen och gav riktning för nästa byggfas. Sammanfattat här så det inte tappas bort mellan sessioner. Inget av det här är byggt än utom där det uttryckligen står "byggt".

- [x] **Chores gjord till egen, synlig meny-post** (byggd denna session) — Mikael påpekade att Chores (Sysslor) missas idag eftersom den bara nås via den generiska "Family"-länken. Löst genom att lägga till en separat "🧹 Chores"-länk i hamburgermenyn (pekar på samma `/dashboard/family`-sida än så länge — en riktig uppdelning i en egen `/dashboard/chores`-sida är ett större, separat jobb om det behövs senare). **Bedömning av själva Chores-funktionen: kärnan är redan bra** — barnvyn (progress-bar, självbetjänings-tillägg av syssla, godkännandeflöde) och föräldravyn (veckosammanfattning, statistik över tid, godkänn/avslå) höll måttet vid granskning. Det var ett rent upptäckbarhetsproblem, inte ett kvalitetsproblem.
- [ ] **Inköpslistan – varu-/receptinläsning, beslutad riktning (inte byggd än):** Mikael var tydlig med att allt måste vara **gratis** (ingen betald AI/OCR-tjänst). Beslutad teknisk riktning:
  - **Streckkodsskanning:** webbläsarens inbyggda `BarcodeDetector`-API (gratis, ingen tjänst) med ett gratis bibliotek (`@zxing/browser`, MIT-licens) som fallback på enheter/webbläsare som saknar stödet, plus uppslag mot **Open Food Facts** (gratis, öppet API, ingen nyckel) för namn/kategori. Total kostnad: 0 kr. Kräver test på en riktig telefon (kameraåtkomst går inte att verifiera i sandboxen).
  - **Recept via foto (bildtolkning av text), inte länk-import:** Mikael vill kunna fota text/recept, inte bara klistra in länkar. Beslutad gratis-lösning: **Tesseract.js** (öppen källkod, körs i webbläsaren, ingen server-kostnad) för att läsa av text i en bild, följt av en enkel regel-baserad tolkning (mönster som "2 dl mjölk", "3 ägg") som lägger till rader på inköpslistan. **Viktig avvägning att kommunicera:** gratis OCR i webbläsaren är märkbart sämre än betalda molntjänster (Google/AWS/Azure Vision) eller AI-tolkning — fungerar bra på tydlig, rak text (utskrivet recept, ett foto av en receptsida), sämre på handskrift eller kreativa tidningslayouter. Om kvaliteten känns för dålig i praktiken är nästa steg en betald tjänst, men det kräver ett nytt kostnadsbeslut då.
  - **Inte byggt än** — nästa konkreta kodrunda, kräver telefontest för både delarna.
- [ ] **Kalendern som nav ("hub") för fler modultyper, beslutad riktning (inte byggd än):** Mikael vill att kalendern blir den gemensamma mötesplatsen för flera funktioner, inte bara reminders/sysslor. En mockup visades i chatten (samma månadsgrid + "vald dag"-panel som redan finns, med två nya prickfärger tillagda: koral för Träning, lila för Skolarbete) för att snabbt visa hur det skulle se ut. Inga nya databasmodeller krävs för själva kalendervyn — den läser redan av allt som har ett datum, se `lib/recurrence.ts`.
- [ ] **Ny funktion: Träningskalender per barn — rekommenderad riktning: prenumeration på offentlig kalenderlänk (.ics), inte full Google/Outlook-inloggning.** De flesta idrottsklubbar/skolor delar redan ut en "lägg till i din kalender"-länk (.ics-format) för lagets schema. Att periodiskt läsa av en sådan länk kräver **ingen inloggning mot Google/Microsoft, ingen extern kostnad, ingen Google-verifieringsprocess** — det är bara en offentlig fil vi läser. Rekommenderat förstasteg, väntar på Mikaels bekräftelse (ställdes som fråga, obesvarad ännu specifikt för kalenderdelen — anta ICS-vägen tills annat sägs, matchar hans "måste vara gratis"-linje för resten av beställningen).
- [ ] **Ny funktion: Skolarbete (kommande prov/läxor) — rekommenderad riktning: återanvänd `Reminder`-modellen, inte en ny tabell.** Lägg till en ny kategori (t.ex. `SCHOOL`) i den befintliga `ReminderCategory`-enumen, återanvänd redan byggd infrastruktur: barn kan lägga till sina egna (samma självbetjänings-mönster som sysslor redan har), synlighet/tilldelning/brådskandegrad finns redan på Reminder-modellen. Betydligt billigare än en ny modell/nytt API. Mikael själv drog samma slutsats i sin beställning ("Reminders kan användas till prov, räkningar och liknande").
- [x] **Kostnadsfråga besvarad: Gmail/Outlook-koppling** (se svar i chatten 2026-07-28) — sammanfattning: Google Calendar-API och Microsoft Graph Calendar-API är i praktiken gratis att använda vid vår skala. Det som kan kosta är dels tid (Googles verifieringsprocess innan fler än 100 testanvändare, oftast gratis men tar veckor), dels en specifik betald granskning (**Google CASA, ca 500–4500 USD/år, återkommande varje år**) som bara krävs om vi vill läsa **Gmail-innehåll** (inte bara kalendern) — en betydligt större, dyrare funktion än ren kalendersynk. Träningskalender-behovet löses billigare via ICS-prenumeration (se ovan) utan att röra någon av dessa kostnader alls.

### Uppföljning samma kväll – Training, School, utgående kalendersynk (2026-07-28, byggt)

Mikael bekräftade ICS-riktningen och lade till två saker: (1) vill också synka **ut** till sin egen privata kalender, inte bara **in** från en klubb, (2) vill kunna lägga upp Training som en vanlig återkommande bokning (t.ex. "Karate, tisdagar") tilldelad ett barn, inte bara importera den utifrån.

- [x] **Training-bokningar byggda** – ny `TRAINING`-kategori, återanvänder Chore-infrastrukturen (`assignedTo`, återkommande veckodagar) men utan godkännande-steg. Eget läge i "New chore"-formuläret (Chore/Training-toggle), egen "⚽ Add training"-knapp på Family-sidan. Se `PRODUCT_SPEC.md` 4b.19.
- [x] **School-kategori byggd, sedan korrigerad till egen sektion** – första versionen lät School gå genom det vanliga Reminders-flödet, men Mikael rättade direkt: *"NEj school borde vara ett eget avsnitt. Missuppfattning."* Reverterat ur Reminders-flödet igen, School är nu en egen sektion på samma sätt som Training: `GET/POST /api/family/chores?category=SCHOOL` (samma endpoint/behörighetsmodell), egen barn-självbetjäningsyta i `family/child/page.tsx` (barn ser **bara sina egna** School-items, via samma `isChild`-filter som redan skyddade Chores/Training), och en ny föräldra-översiktssida `/dashboard/school` grupperad per barn, länkad från hamburgermenyn. Se `PRODUCT_SPEC.md` 4b.19/4b.20.
- [x] **Utgående ICS-kalendersynk byggd** – ett personligt, hemligt kalenderflöde (`User.calendarFeedToken`) som Mikael prenumererar på från sin egen Google/Outlook/Apple-kalender ("Lägg till kalender > Från URL"). Gratis, ingen inloggning mot Google/Microsoft, samma förtroendemodell som delningslänkarna för inköps-/önskelistor. UI i Profile → "Calendar sync". Täcker nu Reminders + Chore + Training + School (alla `visibility: HOUSEHOLD`). Se `PRODUCT_SPEC.md` 4b.19.
- [x] **Deployat och verifierat i Vercel** (2026-07-28) – `prisma generate`/`db push` körda lokalt, kod pushad, Mikael bekräftade att det ser ok ut i Vercel.
- [ ] **Inte byggt än:** inkommande prenumeration på en klubbs/skolans externa .ics-länk per barn (kräver server-side hämtning av en extern URL pga CORS, en ny modell, och periodisk uppdatering) — nästa steg, egen omgång.
- [ ] **Klicktesta i produktion, ännu inte gjort:** skapa en Training-bokning och se den dyka upp i kalendern (koral prick), lägg till ett School-item både som förälder (`/dashboard/school`) och som barn (Family → child view → School-sektionen) och verifiera att ett barn bara ser sina egna, hämta kalenderlänken i Profile och prenumerera på den från en riktig Google/Outlook-kalender.

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
- [x] **Delningslänk för inköpslistan (2026-07-27, klicktestad skarpt 2026-07-27 sen kväll)** *(P1.3-varianten för Grocery, byggd efter jämförelse med OurGroceries/Listonic)* — `Household.shoppingListShareToken`, `/api/family/shopping-list/share` (av/på + länk), publika `/api/public/shopping-list/[token]` + `/shop/[token]`-sidan. Ingen inloggning krävs, full läs/skriv-åtkomst (samma förtroendemodell som `HouseholdInvite`-token). Wishlist-varianten (P1.3 för barnens önskelista, delning till släktingar) är fortfarande inte byggd.
- [ ] **Butiksläge** *(P1.4 – fullskärmsvy för användning i affären: stor text, en-handsvänlig)*
- [ ] **Belöningar kopplat till Sysslor** *(Best4Family-analys 2026-07-28 – utökning av befintlig `ChoreStatus`-godkännandeflow, se `TODO.md` punkt 9)*
- [x] ~~Kompakt "vad händer närmast"-sammanfattning på dashboarden~~ – **redan löst**, upptäckt 2026-07-28: "IQ Spotlight · Up next" + "Needs your attention" täcker redan detta, ingen ny kod behövdes.
- [x] **Dataexport (portabilitetsrätt)** – JSON-nedladdning av egen data. **Byggt 2026-07-28**, se `TODO.md` punkt 10.
- [x] **Broadcast-notis från admin till hela familjen.** **Byggt 2026-07-28**, se `TODO.md` punkt 10.
- [ ] **Admin-switch per funktionstyp** ("Tillåt medlemmar att skapa X") *(Best4Family-analys 2026-07-28 – utökning av roll-modellen)*
- [ ] **Måltidsplanerare kopplad till inköpslistan** *(Best4Family-analys 2026-07-28 – se även Parkerade idéer nedan, "Måltidsplanering")*
- [x] **Kalendervy (2026-07-28) – byggd**, fjärde flik i bottenmenyn (Reminders/Shopping list/Wishlist/**Calendar**). Månadsgrid som visar reminders och sysslor på rätt datum, byggd direkt på befintlig data (`Reminder.date` + `recurrence`: ONCE/DAILY/WEEKLY/MONTHLY/YEARLY, sysslornas `choreRecurrenceDays`) – ingen schemaändring. Ny `src/lib/recurrence.ts` expanderar ett lagrat datum + återkommande-regel till alla förekomster i en synlig månad. Klick på en dag visar dagens poster, klick på en post öppnar reminder-detaljen (`/dashboard/[id]`) eller, för sysslor (som saknar egen detaljsida), Family-hubben. Barnprofiler omdirigeras till sin egna vy precis som huvuddashboarden. Commit `0a3032e`, **inte pushat än** (kräver din `git push`), **inte klicktestat**, se `TEST_VERIFICATION.md`. Extern kalendersynk (Google/Apple) är ett medvetet separat, senare steg, se Fas 3.

---

## Fas 3 – Skala (Höst 2026)
**Mål:** 1000+ användare, lönsam produkt.

- [ ] SMS-påminnelser
- [ ] API för tredjeparts-integrationer
- [x] Familje/team-konton *(byggt tidigare än planerat – se Fas 1.5)*
- [ ] Mobilapp (React Native)
- [ ] Google/Apple Calendar sync *(nästa steg efter Fas 2:s in-app kalendervy – kräver OAuth mot Google/Apple + tvåvägs-synk, se `ROADMAP.md` Fas 2)*
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
- **"Föräldrautrymme"-liknande modul** för separerade föräldrar/medföräldrar – samordna scheman, spåra avtal, hålla info om barn/husdjur strukturerat *(Best4Family-analys 2026-07-28. Intressant differentiator som matchar vår "hemmets bas"-positionering, men ett nytt konceptuellt område – kräver en egen spec-diskussion innan bygge, inte bara "bygg det", se `COMPETITOR_ANALYSIS_BEST4FAMILY.md` §6)*
- **Lågprioriterade moduler identifierade hos Best4Family, medvetet parkerade** *(Best4Family-analys 2026-07-28 – lågt strategiskt värde för vår målgrupp just nu)*: Reseplanerare, Recept, Restauranger, Städplan, Omröstningar, Beslutshjul, Bill Split, Spelverktyg, fria Anteckningar, generella Uppgifter för vuxna (utöver Sysslor)

---

## Kända avvikelser att städa upp
- ~~"AssistIQ" (gammalt projektnamn) fanns kvar i `schema.prisma` och `sw.js`.~~ **Löst 2026-07-27 – långt mer utbrett än väntat:** samma kvarleva fanns även i `manifest.json` (PWA-appnamn), `layout.tsx` (sidtitel/OpenGraph), flera loading-states, header-loggor (register/join-household/admin) och **alla utgående transaktionsmail** (`email.ts` – ämnesrader, header, footer på reminder-, invite-, handover- och welcome-mail). Allt bytt till "Reminder for Simplicity".
- ~~Färgpaletten i `BRAND.md` (`#4F6EF7`) matchade varken `RFS-Product-Direction.md` (`#4A5FD5`) eller `globals.css` (`#5B9CF5`).~~ **Löst 2026-07-26:** `#4A5FD5` (från `RFS-Product-Direction.md`) valdes som sanning. Genomfört i `globals.css`, `BRAND.md` och samtliga `.tsx`-filer i `app/src` + `public/manifest.json`.
- ~~`landing-page.html` (svenska, gammal palett) och `app/src/app/page.tsx` (engelska, ny palett) var två helt olika hero-sektioner.~~ **Löst 2026-07-27:** `landing-page.html` borttagen, `page.tsx` är den enda landningssidan.
- ~~**Språkmotsägelse:** Hela den byggda appen är på engelska, men `PRODUCT_SPEC.md` §9 angav svenska som primärspråk för MVP.~~ **Löst 2026-07-26:** engelska är primärspråk, matchar redan byggd app. PRODUCT_SPEC.md uppdaterad.
- ~~Arbetskopian hade CRLF-radslut (Windows-kopiering), `app/.gitignore` var UTF-16-kodad och innehöll bara `app/.env`, och `app/.env.local` var likaså UTF-16-kodad vilket gjorde att flera miljövariabler tystnat föll bort.~~ **Löst 2026-07-27:** `.gitattributes` tillagd + renormaliserat, `.gitignore` (rot + app) omskrivna i UTF-8, `.env.local` omskriven i UTF-8 med alla nycklar ifyllda (`GOOGLE_CLIENT_ID/SECRET` medvetet tomma – se Todo).
- **Nytt fynd (2026-07-27):** `npm audit` visar att Next.js 14.2 har flera kända säkerhetsluckor (DoS, cache-poisoning, SSRF). Full fix kräver major-uppgradering till Next 16 – för stort/riskabelt för att göra utan din granskning, se Todo punkt 5.
- **Nytt fynd (2026-07-27, sen kväll):** kosmetisk bugg – efter att ha loggat in via PIN visar Profile → Security "Change password" istället för "Signed in with Google" på ett Google-konto. Inte ett säkerhetsproblem, se `TODO.md` punkt 6.

---

*Denna roadmap är ett levande dokument. Uppdatera efter varje sprint.*
