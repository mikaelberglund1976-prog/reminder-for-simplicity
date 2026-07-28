# Konkurrentanalys – Best4Family (best4family.com/dashboard/)

**Datum:** 2026-07-28
**Metod:** Granskat live, inloggat gränssnitt (dashboard, alla 18 moduler, inställningar, familjehantering, samt hela den publika Privacy Policy-sidan) via webbläsare. Inga ändringar gjorda i vår kodbas – detta är ren research inför prioritering.
**Syfte:** (1) bedöma deras design/tillgänglighet, (2) kartlägga funktioner de har som vi saknar, (3) djupanalysera deras privacy-sektion som förlaga för vår egen, (4) jämföra funktioner vi redan har och hitta förbättringar. Målet är **inte** att kopiera – vi ska ta lärdom, men behålla vår egen enkelhet som differentiator.

---

## 1. Sammanfattning

Best4Family är en bred "gör allt"-familjehubb (18 moduler) med gedigen, tydligt juridiskt underbyggd privacy-hantering och finkornig behörighetsstyrning. Styrkan är bredd och strukturerad datahantering; svagheten är att bredden går ut över enkelhet – gränssnittet känns som ett dashboard-verktyg för vuxna administratörer, inte det "lugna, krångelfria" vi siktar på.

**Vår störta möjlighet:** vi kan ta deras strukturerade approach till **privacy/samtycke/minderåriga** och **granulär per-post-sekretess** (t.ex. "Privat uppgift, endast synlig för skapare + tilldelade") nästan rakt av – det är väl genomtänkt GDPR-arbete som vi annars skulle behöva uppfinna själva. Samtidigt bör vi **inte** kopiera bredden i funktionsutbud – vår positionering ("hemmets gemensamma bas", inte ett generellt verktygsverktyg) är fortfarande rätt, se `PRODUCT_SPEC.md` §3.

---

## 2. Design & UX-analys

### Övergripande intryck
Dashboard är ett rutnät av 18 färgkodade "widget"-kort (drag-and-drop-ordnbara) plus en vänster sidopanel med de 6 mest använda modulerna fästa som stora ikon-rutor. Övriga 12 moduler nås via en "Visa alla funktioner"-modal (rutnät av alla ikoner) eller sök (⌘K).

### Vad som är bra (värt att låna idéer från)
- **Global sök (⌘K)** i headern – snabb åtkomst till vilken modul/post som helst, bra tangentbordsstöd för vuxna/power users.
- **Global "Quick Add"-knapp** i headern, alltid synlig – en genväg för att skapa vad som helst utan att först navigera till rätt modul.
- **Sidopanelen är konfigurerbar** – de 6 fästa modulerna kan bytas ut, resten nås i en tydlig "alla funktioner"-modal med drag-handtag för ordning. Bra mönster för att hålla navigeringen kort utan att dölja funktioner helt.
- **Notis-bricka på sidopanelens moduler** (t.ex. röd "1" på Uppgifter) – samma mönster som vår egen bottenmeny-badge (`lib/listBadges.ts`), bra bekräftelse på att vårt val var rätt.
- **Färgkodning per modul** är konsekvent genom hela appen (samma färg på sidopanel-ikon, dashboard-kort och modulens egen header) – ger snabb visuell orientering. Vi gör redan detta för kategorier i inköpslistan (4b.14) men inte modul-till-modul.
- **Per-post sekretess som en synlig "chip"** – varje uppgift visar en liten "Privat"-tagg med hänglås-ikon direkt i kortvyn, inte gömd i ett inställnings-menyn. Tydlig, förtroendeingivande UI-lösning för ett koncept (sekretess) som annars är osynligt.
- **Family Profile-vy** – en samlad "hero"-vy av hushållet (bakgrundsbild, medlemslista) skild från inställningar, ger en varmare "detta är vår familj"-känsla.

### Vad som är svagt / där vi redan gör det bättre
- **Tomma tillstånd är kliniska och likadana överallt** ("Inget att köpa just nu", "Inga anteckningar ännu", "0 aktiva omröstningar") – ingen illustration, ingen uppmuntran att komma igång, inga exempel. Vår produkt bör fortsätta ha varmare, mer vägledande tomma tillstånd (matchar vår "enkel, varm, organiserad"-ton i `PRODUCT_SPEC.md` §2).
- **18 moduler på en gång är kognitivt tungt** – även med sidopanel + modal känns förstasidan som ett adminpanel-rutnät, inte ett lugnt ställe. Det är precis den fällan vi medvetet undviker (`PRODUCT_SPEC.md` §3: "vi konkurrerar inte med generella uppgiftshanteringsverktyg"). **Vår 3-flikars bottenmeny (Reminders/Shopping/Wishlist) är ett genuint UX-försprång här** – behåll disciplinen att inte lägga till en flik per ny modul.
- **Skapa-formulär har många fält synliga direkt** (se Uppgifter-formuläret: titel, beskrivning, länk, prioritet, förfallodatum, tilldela, länka husdjur, återkommande, privat – 8 fält på en gång, inget progressivt). Det bryter mot vår egen princip i `PRODUCT_SPEC.md` §9 ("Max 3 klick", "Inga obligatoriska fält utom namn och datum"). **Vi vinner redan här om vi håller fast vid det.**
- **Ingen synlig progressive disclosure** – allt är alltid synligt (alla fält, alla widgets), inget som gradvis avslöjas när man faktiskt behöver det. Vår mobil/webb-vy-växlare och optimistiska UI (4k) är exempel på motsatt, bättre tänk.
- **Mörkt/tungt bildspråk i bakgrunden** (stora fotografier av familjer bakom halvgenomskinliga paneler på inställningssidor) känns generiskt stockfoto-aktigt, inte i linje med en lätt, tillgänglig känsla.
- **Tillgänglighet (a11y) osäker** – kunde inte verifiera kontrastnivåer/skärmläsarstöd på djupet i denna genomgång, men flera kort använder ljus text på pastellfärgad bakgrund (t.ex. gul "Kalender"-kort med mörkgul text) som bör kontrastkollas om vi skulle inspireras av paletten. Vår egen enfärgade `#4A5FD5`-identitet (BRAND.md) är enklare att kontrastsäkra konsekvent.

### Konkret rekommendation för vårt "lättanvänd"-mål
Behåll vår smala scope och progressiva formulär, men **låna**: (1) en global "Quick Add"-liknande genväg om vi växer till fler listtyper, (2) synlig sekretess-chip per post om/när vi bygger ut visibility (vi har redan grunden via `visibility: PRIVATE/HOUSEHOLD/PARENTS` på Reminder, se 4b.5 – den är bara inte synlig som UI-tagg ännu), (3) varmare tomma tillstånd som differentiator, inte något att kopiera bort.

---

## 3. Funktionskarta – vad Best4Family har som vi saknar

18 moduler i Best4Family, jämfört med vårt nuläge (Reminders, Shopping list, Wishlist, Chores/sysslor, Family/Household):

| Best4Family-modul | Vad den gör | Har vi motsvarande? | Prioritetsförslag |
|---|---|---|---|
| Kalender | Delad familjekalender, "nästa evenemang/semester", **"barn stannar"** (vårdnads-/boschema) | Nej (vi har bara datum på reminders, ingen egen kalendervy) | **P1** – en enkel delad kalender är en naturlig nästa modul om vi breddar oss ytterligare, men kräver eget scope-beslut, se §6 |
| Uppgifter (Tasks) | Generella uppgifter m. prioritet, tilldelning, länk, husdjur-koppling, privat-toggle | Delvis – vi har Sysslor (Chores) för barn, inga fria "tasks" för vuxna | **P2** – bara om vi vill bredda bortom "hemmets bas"-scope, se avvägning nedan |
| Reseplanerare | Resor + "idéer"-lista per resa | Nej | **P3** – parkerad, inte kärnverksamhet |
| Shopping | Delad inköpslista | **Ja, och vår är mer utvecklad** (kategorier, flera listor, delningslänk, katalog, Recent-chips – se 4i/4k/4l) | – |
| Anteckningar | Fria anteckningar | Nej | **P2** – enkel att bygga, men risk att bli "ännu en anteckningsapp" |
| **Föräldrautrymme** (Parent Space) | Delad arbetsyta för separerade föräldrar/medförälder: samordna scheman, begära ändringar, spåra avtal, hålla info om barn/husdjur strukturerat | Nej | **P1 – intressant differentiator.** Matchar vårt "hemmets bas"-tema bättre än de flesta andra modulerna. Värt en egen spec-diskussion, inte en enkel kopiering. |
| Måltidsplanerare | Planera måltider per dag/vecka | Nej | **P2** – kopplar naturligt till inköpslistan (jfr redan parkerad idé "Måltidsplanering" i `ROADMAP.md`) |
| Recept | Spara recept | Nej | **P3** |
| Restauranger | Sparade platser | Nej | **P3** – lågt värde för vår målgrupp |
| Städplan | Städschema per område | Nej | **P3** – överlappar med Sysslor, lågt mervärde |
| Omröstningar | Familjeröstningar ("var ska vi äta?") | Nej | **P3** |
| Beslutshjul | Slumpmässigt "vem gör vad"-hjul | Nej | **P3** – trevlig gimmick, inte kärna |
| Listor | Generiska att-göra-listor utöver shopping | Delvis (vår `List`-modell från 4l är redan generell nog för fler listtyper) | – redan löst arkitekturellt |
| Budget | Enkel budget/utgiftsspårning | Delvis – vi har Kostnadsgraf (§4.5 i PRODUCT_SPEC) för abonnemang, inte en full hushållsbudget | **P2** – "Kostnadssummering per kategori" står redan i `ROADMAP.md` Fas 2 |
| Bill Split | Dela räkningar mellan medlemmar | Nej | **P3** |
| Önskelista | Barn lägger till önskningar, föräldrar reserverar/köper, status dold för barnet | **Ja, och vår har starkare integritetsgaranti** (status stripped server-side, inte bara UI-dold – se 4b.9) | – |
| Belöningar | Belöningssystem kopplat till klarade sysslor | Nej | **P2** – naturlig utökning av Sysslor/Chores, hög fit med vår familjemålgrupp |
| Spelverktyg | Familjespel/aktivitetsverktyg | Nej | **P3** – lågt strategiskt värde |

**Familjehantering/behörigheter de har som vi delvis saknar:**
- **Gästprofiler utan inloggning** – lägg till mor-/farföräldrar eller släktingar som "syns i planeringen" utan att de behöver ett konto. Vi har bara riktiga konton (även barn måste ha email sedan 4j). **P1-kandidat** – låg komplexitet, löser ett verkligt problem (mor-/farföräldrar som inte vill/kan skapa konto).
- **Admin-styrda skapandebehörigheter** ("Tillåt medlemmar att skapa uppgifter/måltidsförfrågningar") – finkornig kontroll över vem som får skapa vad. Vi har roll-baserad åtkomst (OWNER/PARENT/ADULT/CHILD) men ingen separat på/av-switch per funktionstyp.
- **Anpassningsbar bakgrundsbild per hushåll** – kosmetiskt, lågt prioriterat.
- **Broadcast-notis till hela familjen** ("Skicka familjeuppdatering", push till alla med aviseringar på) – **P2**, enkel att bygga ovanpå vår befintliga notis-infrastruktur, bra för admin/förälder-kommunikation.
- **Max 12 medlemmar / 2 hushåll per faktureringskonto** – en tydlig, kommunicerad gräns. Vi har ingen deklarerad gräns idag; värt att bestämma en innan lansering (även om den bara är teoretisk just nu).

---

## 4. Funktioner vi redan har – jämförelse och förbättringsförslag

### Reminders vs. deras Kalender+Uppgifter
Vi har inget renodlat kalenderflöde – reminders är listbaserade med datum, inte en visuell kalender. Best4Family separerar "tidsstyrda händelser" (Kalender) från "att göra"-uppgifter (Uppgifter), medan vi slår ihop allt i Reminders. Det är en medveten enkelhet från vår sida (`PRODUCT_SPEC.md` §3) och vi bör **inte** överge det – men deras "nästa evenemang / nästa semester / barn stannar"-sammanfattning överst på Kalender-kortet är en bra idé för vår egen dashboard: en kompakt "vad händer närmast"-rad ovanför reminder-listan, snarare än en hel kalendervy.

### Sysslor (Chores) vs. deras Uppgifter + Belöningar
Deras Uppgifter har **prioritetsnivåer (Låg/Medel/Hög)** och **fri länk-bilaga** som vi saknar på Sysslor. Vår Handover-mekanik (assignedTo/fallbackTo/handoverState, se 4b.5) är mer sofistikerad än deras enkla "Tilldela till". Deras **Belöningar**-modul (kopplad direkt till klarade uppgifter) är dock något vi helt saknar – vi har godkännande-flöde (`ChoreStatus`) men ingen belöning i andra änden. **Konkret förslag:** en enkel "poäng eller belöning per godkänd syssla"-modul skulle passa naturligt in i vår befintliga Chore-arkitektur utan stor omskrivning.

### Delad inköpslista vs. deras Shopping
Vår är redan mer utvecklad (se `TODO.md` 4i/4k/4l – kategorisering, flera listor, delningslänk, katalog, optimistisk UI). Inget att förbättra utifrån deras version specifikt.

### Önskelista vs. deras Önskelista
Likvärdig kärnfunktionalitet, men vår serverside-strippning av statusfält (4b.9) är strängare/säkrare än vad som går att bekräfta om deras implementation (deras privacy policy nämner inte teknisk detalj kring detta). **Vi ligger före här** – inget att ändra.

### Familj/roller vs. deras Familj & Grupp
De har två saker vi saknar och som är låg-komplexitet att lägga till: **gästprofiler utan inloggning** (se P1 ovan) och **per-funktion skapandebehörigheter** (switch: får medlemmar skapa X). Vår roll-modell (OWNER/PARENT/ADULT/CHILD/MEMBER) är redan mer detaljerad än deras platta "roller", så grunden finns – det är mest UI för att exponera finare kontroll som saknas.

---

## 5. Privacy-sektionen – djupanalys (detta bör vi bygga upp)

**Viktig brasklapp:** jag är inte jurist och det här är inte juridisk rådgivning. Best4Family är registrerat i Luxemburg och skriver sin policy mot GDPR + luxemburgsk lag. Innan vi publicerar en egen privacy policy bör en riktig integritetspolicy-mall (t.ex. från en svensk/EU-jurist eller en betrodd generator) användas som grund – men **strukturen och vilka ämnen som måste täckas** kan vi lära oss mycket av här.

### Deras struktur (14 sektioner)
1. Personuppgiftsansvarig (företag, adress, org.nr, kontakt-email)
2. Policyns omfattning
3. Territoriell räckvidd / rättslig grund / global tillgänglighet
4. Vilka data de behandlar – **uppdelat i 9 tydliga underkategorier**: kontodata, familj/roll/medlemskapsdata, användnings-/innehållsdata, uppladdningar/foton/dokument, prenumeration/fakturering, teknisk/loggdata, analys (GA4/Firebase), push-notiser, AI/automatiserad serverbehandling
5. Syften med behandlingen
6. Rättslig grund (GDPR Art. 6.1 b/f/a, uppdelat per kategori)
7. Mottagare/biträden (Firebase, GA4, RevenueCat, Apple/Google, Expo, OpenAI – namngivna, med vad de gör)
8. Överföring till tredje land
9. Lagringstid
10. Registrerades rättigheter (åtkomst, rättelse, radering, begränsning, portabilitet, invändning, återkalla samtycke) + rätt att klaga hos tillsynsmyndighet
11. Cookies/analys/samtyckeshantering (web vs. app skiljs åt)
12. **Minimiålder, föräldrasamtycke och skydd av minderåriga** – egen huvudsektion, 5 undersektioner
13. Ingen personanpassad reklam idag (transparent löfte om att meddela innan det ändras)
14. Ändringar i policyn

### Vad vi bör göra likadant
- **Namngivna underleverantörer med syfte** (vi använder Supabase, Resend, Vercel – dessa bör listas explicit med vad de gör, i linje med GDPR Art. 28-krav på biträdesavtal-transparens).
- **Tydlig åldersgräns + föräldrasamtyckestrappa.** Vi har redan barnprofiler (isChildProfile) men ingen deklarerad minimiålder eller samtyckeslogik i produkten eller specen. Det här är ett **verkligt gap** – vi bör besluta en åldersgräns (13 är branschstandard, matchar COPPA i USA) och dokumentera vem som "äger" samtycket för en barnprofil (rimligt: föräldern som skapar profilen, eftersom vi redan kräver en riktig email från föräldern vid skapande, se 4b.2).
- **"Skydd av minderåriga från olämpligt innehåll"-avsnitt** – deras poäng om "privat, endast-inbjudan, inga publika profiler, ingen kontakt med främlingar" stämmer redan på vår arkitektur (allt är hushålls-scopat) – vi kan skriva detta rakt av eftersom det redan är sant för oss.
- **Rättighetslista (GDPR-artiklarna)** – standardtext, lätt att återanvända, men måste faktiskt implementeras (t.ex. har vi idag ingen självbetjänings-dataexport eller "radera mitt konto"-knapp i produkten – Best4Family har en dedikerad "Radera konto"-sida). **Konkret gap:** vi saknar en synlig "radera mitt konto permanent"-funktion i UI. Värt att bygga innan en publik lansering, inte bara ha det som ett policy-löfte.
- **Separera analytics-hantering tydligt per plattform** (webb vs. app) och deklarera explicit att ingen personanpassad reklam/IDFA-åtkomst sker – enkelt förtroendeskapande stycke om vi också håller oss borta från reklamspårning (vilket vi redan gör, ingen annonsinfrastruktur finns).

### Vad vi bör göra annorlunda / bättre passat oss
- **Vi är mindre och enklare – policyn kan vara kortare.** Vi har inte AI-driven receptbehandling, ingen tredjeparts-analys-motor kopplad till reklam, inget App Store/Play-abonnemang ännu (Stripe är fortfarande inte byggt, se `TODO.md` punkt 4). En first-version-policy för oss kan hoppa över sektioner som inte är tillämpliga än (t.ex. "AI-assisterad behandling", "in-app-köp via Apple/Google") och växa i takt med produkten, snarare än att skriva för funktioner vi inte har.
- **Vår starkare tekniska garanti bör synas i policyn, inte bara i koden.** Vi har redan en starkare integritetsgaranti än vad Best4Family beskriver för sin egen Önskelista (server-side fältstrippning, se 4b.9) – det bör vi **skriva ut explicit** i vår privacy policy som ett konkret löfte ("barnets önskelista-status skickas aldrig till klienten"), inte bara en implementationsdetalj. Det är ett trovärdighetsvapen mot en konkurrent som inte är lika specifik.
- **Vi bör vara tydliga om var data lagras** (Supabase-region) på samma sätt som de deklarerar EU-behandling för Firebase Analytics – bra att kunna säga "din familjs data lagras i [region]" om det stämmer.

### Konkreta åtgärder för vår egen privacy-sektion (prioriterat)
1. **P0 – innan betalande användare/bred lansering:** skriv en riktig Privacy Policy-sida (idag finns ingen, baserat på genomgången kodbas) med minst: personuppgiftsansvarig, vilka data vi behandlar (konto, hushåll/roller, reminders/listor/innehåll, teknisk/loggdata), rättslig grund, tredjepartsleverantörer (Supabase, Resend, Vercel, ev. Google OAuth), lagringstid, användarens rättigheter, kontaktväg för dataförfrågningar.
2. **P0 – minimiålder & föräldrasamtycke:** besluta och dokumentera en åldersgräns för barnprofiler + vem som samtycker (rimligt: skapande föräldern, kopplat till redan befintligt email-krav).
3. **P1 – självbetjänings-kontoradering:** bygg en "radera mitt konto permanent"-knapp/flöde i Profile → Security (matchar Best4Familys mönster), inte bara en policy-text om rätten att bli raderad.
4. **P1 – dataexport:** enkel "exportera min data"-funktion (även bara en JSON-nedladdning) för att uppfylla portabilitetsrätten.
5. **P2 – synlig sekretess-indikator per post**, om/när vi bygger ut `visibility`-fältet (PRIVATE/HOUSEHOLD/PARENTS finns redan i schemat för Reminders, se 4b.5) till fler modeller – ta deras "Privat"-chip-mönster som UI-referens.

---

## 6. Rekommenderad väg framåt

**Håll fast vid vår smalare positionering** ("hemmets gemensamma bas", inte ett generellt 18-modulers verktyg) – det är fortfarande rätt beslut och vår främsta konkurrensfördel mot Best4Family, som känns bredare men tyngre.

**Föreslagen prioritetsordning för nästa beslut (inte redan bestämt, för diskussion):**
- **P0 (bör in före bred lansering):** riktig Privacy Policy-sida, deklarerad åldersgräns/föräldrasamtycke, självbetjänings-kontoradering.
- **P1 (stark fit, låg-medel komplexitet):** gästprofiler utan inloggning (mor-/farföräldrar), Belöningar kopplat till Sysslor, en kompakt "vad händer närmast"-sammanfattning på dashboarden (inspirerat av deras Kalender-kort, utan att bygga en full kalender).
- **P1, men kräver egen produktdiskussion (inte bara "bygg det"):** Föräldrautrymme (Parent Space) för separerade föräldrar – intressant differentiator, men ett helt nytt konceptuellt område som förtjänar en egen spec-runda med dig innan vi bygger.
- **P2 (naturlig utökning, lägre tidspress):** Måltidsplanerare (kopplad till inköpslistan), broadcast-notis till familjen, kostnadssummering per kategori (redan i `ROADMAP.md` Fas 2).
- **P3 (parkerat, lågt strategiskt värde för vår målgrupp just nu):** Reseplanerare, Recept, Restauranger, Städplan, Omröstningar, Beslutshjul, Bill Split, Spelverktyg, Anteckningar, generella Uppgifter för vuxna.

Se `TODO.md` (ny sektion 9) och `ROADMAP.md` (nya rader under Fas 2/Fas 3/Parkerade idéer) för hur detta är inarbetat i den löpande planen.
