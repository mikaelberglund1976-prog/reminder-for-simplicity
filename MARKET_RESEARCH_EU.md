# Marknadsundersökning – Familjeappar i EU (2026-07-28)

**Metod:** Webbsökningar + genomläsning av jämförelseartiklar/produktsidor för ledande familj-organizer-appar med fokus på EU/GDPR-vinkeln, kompletterat med den tidigare djupanalysen av Best4Family (`COMPETITOR_ANALYSIS_BEST4FAMILY.md`). Sekundärkällor (bloggjämförelser, marknadsrapporter), inte egna intervjuer – bör kompletteras med riktiga användarintervjuer inför/under betan.
**Syfte:** komplettera Best4Family-analysen med en bredare bild av kategorin, hitta vad familjer efterfrågar generellt (inte bara hos en konkurrent), och identifiera EU-specifika trender (GDPR, datalagring) som påverkar oss.

---

## 1. De stora spelarna och vad de äger som "sin grej"

| App | Ursprung | Huvudsaklig styrka | Svaghet |
|---|---|---|---|
| **Cozi** | USA | Marknadsledande delad kalender sedan 2005, matlistor, enkelhet | Ingen AI, ingen "mental load"-vy, annonser i gratisnivån, data i USA (GDPR-fråga för EU), känns daterad |
| **Tribe Family** | EU (byggd post-GDPR) | **Mental Load Balancer** – kognitivt viktade uppgifter + veckovis "vem bar vad"-dashboard, AI (Claude) som ser familjens faktiska kontext, 100% EU-hosting | Nyare, färre integrationer, gratisnivå begränsad till 5 medlemmar |
| **FamilyWall** | Frankrike (EU) | Bred "allt-i-ett": kalender, meddelanden, platsdelning, fotoalbum, ekonomi | Integritetspolicy mindre tydlig än den borde vara, känns "tunn" på djupet i varje del |
| **OurHome** | USA (indie) | **Gamifierade sysslor** – poäng per syssla, barn "löser in" belöningar själva, mycket effektivt för under-10-åringar | Ingen kalender-substans, ingen budget, ingen AI, tappar värde när barnen blir tonåringar |
| **Family Folder** | EU-hostat, GDPR-anpassat | **Dokumentvalv** – familjens papper/ID/försäkringar med roller (Owner/Contributor/Viewer), **har en publik röstningssida (Canny)** för förbättringsförslag | Inte kalender/sysslor-fokuserad, bara vald nisch |
| **TimeTree** | Japan/USA | Flera delade kalendrar, händelse-chatt kopplad till varje händelse | Bara kalender, inget annat |
| **Any.do Family** | Israel | Bäst-i-klass realtids-delade inköpslistor | Generisk produktivitetsapp med familjelager ovanpå, inte familjefödd |
| **OurFamilyWizard** | USA | Juridiskt gångbara register för separerade föräldrar (meddelanden, betalningar, ton-analys) | Dyr (per förälder), för mycket "process" för vanliga familjer |
| **Life360** | USA | Platsdelning/säkerhet (körrapporter, krockdetektering) | Ingen organizer-funktionalitet alls |

**Slutsats:** ingen enskild app "vinner" på bredd. Marknaden 2026 delar sig i tydliga nischer – kalender-först (Cozi/TimeTree), dokument-först (Family Folder/Trustworthy), sysslor-först (OurHome), mental load/AI-först (Tribe Family), juridiskt co-parenting (OurFamilyWizard). **Vi (Reminders + delad inköpslista + barnens önskelista + sysslor + kalendervy) ligger redan mitt i en kombination som ingen konkurrent renodlat äger** – det är vår öppning, inte en svaghet.

---

## 2. Vad familjer faktiskt efterfrågar (branschgemensamt, oavsett app)

Genomgående mönster i alla jämförelseartiklar och "hur väljer man"-guider:

1. **En sak ska lösas riktigt bra, inte 18 saker halvbra.** Nästan alla artiklar landar i samma råd: "fråga vad som är den största dagliga friktionen – missade händelser, syssel-bråk, eller matinköp – och välj appen som löser just det." Detta bekräftar vår befintliga strategi (`PRODUCT_SPEC.md` §3, `COMPETITOR_ANALYSIS_BEST4FAMILY.md` §6) att inte bredda oss till 18 moduler.
2. **Adoption av den mest ovilliga familjemedlemmen är den bindande begränsningen.** Flera guider pekar ut att appens komplexitet ska anpassas efter den minst tekniska personen i hushållet, inte den mest entusiastiska. Stärker vår "max 3 klick"-princip.
3. **Datalagring/GDPR är ett verkligt köpskäl i EU 2026**, inte bara juridiskt småprint. Tribe Family bygger hela sin marknadsföring på "100% EU-hosted, no ads, AI does not train on your data" och jämförelsesajter listar explicit vilka appar som är EU- vs. USA-hostade som ett förstklassigt beslutskriterium (post-"Schrems II"-medvetenhet). **Vi bör kunna svara på var vår data lagras (Supabase-region) lika tydligt**, se redan identifierat gap i `COMPETITOR_ANALYSIS_BEST4FAMILY.md` §5.
4. **"Mental load"-språket är på väg in som ett eget säljargument**, inte bara uppgiftshantering. Tribe Family bygger en hel funktion (kognitivt viktade uppgifter, veckovis "vem bar vad") kring detta. Vi har redan byggstenarna (assignedTo/fallbackTo/urgencyLevel/visibility på Reminders) men exponerar dem inte som ett "mental load"-koncept i UI eller marknadsföring – **möjlig framtida vinkel, inte akut**.
5. **Gamifiering fungerar specifikt för sysslor hos yngre barn (under ~10 år)**, tappar värde för tonåringar. Bekräftar att "Belöningar kopplat till Sysslor" (redan P1 i `ROADMAP.md`/`TODO.md` punkt 9) är rätt prioriterat och rätt avgränsat (inte försöka gamifiera allt).
6. **AI-värdet ligger i konkreta, kontextuella förslag – inte generella chattbottar.** Både Tribe Family och Maple (skolmail → händelser/uppgifter) får beröm för smalt, konkret AI (ett förslag i taget baserat på faktisk data), medan generisk "fråga vad som helst"-AI bedöms som mindre värdefullt. Relevant om vi någon gång bygger AI-funktioner – smalt och kontextuellt slår brett och generellt.
7. **Offentliga/delade förbättringsförslag-sidor med röstning är redan branschpraxis**, inte en ovanlig idé: Family Folder länkar en publik Canny-board direkt i sin footer, Tribe Family har en publik `/roadmap`-sida. Detta styrker beslutet (se nedan) att bygga vår egen delade "Ideas & voting"-sektion.
8. **Marknaden växer stabilt men är inte en guldrush:** parenting-app-marknaden i Europa värderas till ca 194 miljoner USD (2025) med ~7,4% årlig tillväxt; global "family tracking app"-marknad växer snabbare (~18% CAGR) men är en annan kategori (platsdelning, inte organizer). Regulatoriska krav (GDPR/COPPA-liknande regler) höjer efterlevnadskostnader ~12–15%, vilket gynnar mindre aktörer som är GDPR-native från start (som oss) jämfört med stora, äldre USA-baserade appar som måste bygga om efterhand.

---

## 3. Direkt relevanta USP-möjligheter för oss (kopplat till vad vi redan har)

| Vad marknaden visar | Vad vi redan har | Vad vi kan göra litet/snabbt för att stärka det |
|---|---|---|
| EU-hosting/GDPR som köpskäl | Supabase (kan vara EU-region), ingen annonsinfrastruktur, ingen datasäljning | Bekräfta/deklarera Supabase-region explicit, skriva en riktig Privacy Policy (redan P0 i `COMPETITOR_ANALYSIS_BEST4FAMILY.md` §5) – **detta är nu även ett marknadsföringsargument, inte bara ett juridiskt krav** |
| "En sak, riktigt bra" > bred "allt-i-ett" | Smal scope (Reminders/Shopping/Wishlist/Chores/Calendar) | Fortsätt säga nej till Reseplanerare/Recept/Restauranger/Städplan (redan P3, se Best4Family-analysen) – marknadsdata bekräftar att detta är rätt, inte bara vår smak |
| Gamifierade sysslor för yngre barn | `ChoreCompletion`/`ChoreStatus`-flöde utan belöning i andra änden | Bygg "Belöningar kopplat till Sysslor" (redan P1) – nu med extra tyngd: det är den enda funktionen i hela jämförelsen som en dedikerad konkurrent (OurHome) bygger hela sin produkt runt |
| Publika röstningssidor är standard | Inget innan idag | **Byggt denna session**, se §4 nedan och `PRODUCT_SPEC.md` 4b.18 |
| "Mental load"-språk som säljargument | `visibility`/`urgencyLevel`/`assignedTo`/`fallbackTo` finns redan i schemat | Ingen kod nu – men värt att notera som en framtida marknadsförings-/UI-vinkel ("se vem som bär vad") snarare än ny funktionalitet, eftersom datamodellen redan klarar det |
| Separerade föräldrar är ett eget, betalningsvilligt segment (OurFamilyWizard) | Inget idag | Redan identifierat som "Föräldrautrymme"-idé i `ROADMAP.md`/parkerade idéer – marknadsdata bekräftar att det är ett riktigt segment, inte bara en gissning, men förtjänar fortsatt en egen spec-runda innan bygge |

---

## 4. Vad som byggdes utifrån detta (2026-07-28)

Efter avstämning med Mikael om omfattning byggdes en **delad, inloggningskrävande "Ideas & voting"-sektion** (förbättringsförslag + nya funktioner, med röstning) – se `PRODUCT_SPEC.md` 4b.18 för full teknisk beskrivning. Kort sammanfattning:

- Ny sida `/dashboard/suggestions`, länkad från hamburgermenyn ("💡 Ideas & voting").
- **Global över alla kunder** (inte hushålls-scopad) – alla inloggade användare ser samma lista och röstar på samma förslag, enligt mönstret från Tribe Familys publika roadmap och Family Folders Canny-board (se §2 punkt 7 ovan).
- Två kategorier: Improvement / New feature. Statusflöde: Open → Planned → In progress → Done/Declined, ändringsbart bara av admin (`ADMIN_EMAIL`).
- Röstning: en röst per användare och förslag, togglingsbar (samma mönster som Canny/GitHub-reaktioner). Den som postar ett förslag röstar automatiskt på sitt eget.
- **Kräver databasändring** – nya modeller `Suggestion`/`SuggestionVote` i `schema.prisma`. Samma mönster som tidigare ändringar denna sommar: kräver `npx prisma generate && npx prisma db push` lokalt hos Mikael innan det fungerar i produktion (sandboxen kan inte nå `binaries.prisma.sh`, samma kända begränsning som i `TODO.md` punkt 4k/l).

---

## 5. Källor

- [Best Family Management Apps of 2026: 8 Tested & Compared – Tribe Family](https://mytribefamily.com/blog/best-family-management-apps-2026)
- [11 Best Family Organizer Apps in 2026 (Honest Comparison) – Family Folder](https://familyfolder.com/blog/best-family-organizer-app.html)
- [Best Family Organizer Apps in 2026 – Pistachio](https://heypistachio.com/blog/best-family-organizer-apps-2026/)
- [Best Family Management Apps of 2026: 8 Tested & Compared – Tribe Family](https://mytribefamily.com/blog/best-family-management-apps-2026)
- [OurHome App Review: The Ultimate Free Family Organizer – Tidied Blog](https://www.tidied.app/blog/ourhome-app-review)
- [Parenting App Market Analysis 2026 – Cognitive Market Research](https://www.cognitivemarketresearch.com/parenting-app-report)
- [Family Tracking App Market Size, Share | CAGR of 18.4% – Market.us](https://market.us/report/family-tracking-app-market/)
- Egen tidigare djupanalys: `COMPETITOR_ANALYSIS_BEST4FAMILY.md` (2026-07-28)

*Metodnot: sekundärkällor (bloggjämförelser/marknadsrapporter), inte primärforskning. Flera av dessa sajter är själva marknadsföring för en av apparna i jämförelsen (t.ex. Tribe Familys och Family Folders egna blogginlägg) – läst med den bias i åtanke, men de underliggande observationerna om branschtrender (EU-hosting som köpskäl, smal scope vinner, gamifiering fungerar för yngre barn) återkommer konsekvent över flera oberoende källor och bedöms tillförlitliga.*
