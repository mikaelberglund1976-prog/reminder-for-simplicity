# Assistiq – Master Product & Build Brief

*Sparad 24 okt 2026 (Mikaels brief, komprimerad formatering, innehåll oförändrat). Gap-analys mot koden: projekt-doc `claude/etapp-0-analys-2026-10-24.md`. Status och plan: `ROADMAP.md` ("Masterbriefens etapper") och `NEXT_STEPS.md`.*

**Status 25 okt 2026 (kväll):** etapp 0–5 och alla allmänna krav (§26, §30–33, §37) är genomförda i webbappen. Etapp 6 är gjord så långt en webbapp räcker (röst, dela till appen på Android, offline-kö, push), och Etapp 7 (WhatsApp) är utredd. Delningslänken för önskelistan är byggd men avstängd tills Mikael har bestämt sig. Detaljer finns i `ROADMAP.md` ("Masterbriefens etapper") och `RELEASE_2026-10-25*.md`, och det som återstår i `NEXT_STEPS.md`.

**Grundregel från Mikael (24 okt):** de två befintliga användarnas data ska vara orörd i allt arbete enligt denna brief.

## 1. Syfte
Assistiq ska utvecklas från dagens PWA mot en mobile-first familjeapp. Inte en ny produkt från grunden – befintlig funktionalitet, data, integrationer och fungerande flöden återanvänds. Målet är inte fler funktioner utan att göra Assistiq: enklare på ytan, kraftfullare under ytan, snabbare att förstå, mer automatiserad, mer relevant i familjens vardag, tydligt differentierad från vanliga familjekalendrar och reminder-appar. Produkten ska i första hand minska den mentala administrationen för familjer med skolbarn.

## 2. Primär målgrupp
Föräldrar med barn ca 6–16 år, ofta flera barn och flera externa informationskällor (skolsystem, SchoolSoft, Studybee, MyClub, iCal/WebCal, föreningar, kalenderflöden, familjemedlemmar, manuella reminders). Familjen: en eller flera föräldrar/vårdnadshavare, barn, andra vuxna/caregivers, externa personer med ibland begränsad åtkomst.
Kärnproblemet är inte "vi behöver en kalender" utan: *familjen har information och ansvar utspritt över för många personer och källor, och någon måste hela tiden hålla ihop allt.*

## 3. Produktlöfte
> Familjen ska inte behöva mata in, komma ihåg eller vidarebefordra information som Assistiq kan hantera åt dem.

Grundflöde: **Fånga → förstå → koppla till rätt person → organisera → visa → påminna → utföra.** Detta är riktningen; allt byggs inte samtidigt.

## 4. Övergripande produktprincip – Enkel på ytan. Kraftfull under ytan.
Användaren ska inte behöva förstå alla funktioner från början, konfigurera allt, välja modul innan information kan läggas till, känna till intern datamodell, eller administrera sådant som redan finns i externa system. Funktioner blir synliga när de är relevanta (Resor först när en resa finns; önskelista dominerar inte förrän en födelsedag närmar sig; Sysslor finns fullt ut utan att konkurrera med dagens viktigaste information).

## 5. Produktstruktur
- **CORE:** Hem (familjens aktuella lägesbild), Quick Capture (snabbaste vägen in), Skola (automatisk extern inhämtning kopplad till person), Aktiviteter (extern + manuell, kopplad till person), Kalender (samlad familjeöversikt), Påminnelser/Actions, Barnets dag (vad gäller för detta barn idag och framåt), Familj/personer (vem gäller det, vem får se/göra vad).
- **SUPPORTING:** Inköpslista (mycket lätt att nå, barn kan bidra, hög återkommande användning). Sysslor (ansvar, återkommande, barnets deltagande – inte ett separat gamification-system).
- **CONTEXTUAL:** Födelsedagar, Önskelistor, Resor – finns under Mer, lyfts fram när relevanta, dominerar inte kärnan.
- **INFRASTRUCTURE:** externa integrationer, iCal/WebCal, roller och behörigheter, notiser, WhatsApp, språk, offline, synk, integritet, analytics, framtida AI/capture-infrastruktur.

## 6. Navigation
Behåll möjligheten att anpassa. Default: **Hem – Kalender – Inköp – Skola – Mer.** Hem alltid först, Mer alltid sist, tre mittenpositioner konfigurerbara, default fungerar utan konfiguration. Aktiviteter, Sysslor, Födelsedagar, Önskelistor, Resor nås från Mer och kan exponeras kontextuellt från Hem.

## 7. Hem – ny roll
Inte en samling länkar utan **familjens operativa lägesbild**: Vad händer idag? Vad behöver min uppmärksamhet? Vad händer härnäst?
- **Header:** behåll familjekänsla, bild, datum, personlig hälsning – men mindre utrymme, information börjar högre upp.
- **Quick Capture:** mycket framträdande ("Lägg till något…"): mjölk / tandläkare torsdag 14 / Filip match lördag / ring försäkringsbolaget / köp present till Tyra.
- **Idag:** samlad bild från skola, aktiviteter, kalender, reminders, sysslor – inte separata modulblock om det går att undvika.
- **Behöver din uppmärksamhet:** endast saker som kräver handling (prov om två dagar, aktivitet ändrad, försenad reminder, pass behöver förnyas, något som saknar person). Signal, inte mer kalenderdata.
- **Nästa per barn:** snabb översikt, tryck → Barnets dag.

## 8. Quick Capture
Nu: förbättra befintlig textinput. När systemet kan avgöra destination (Mjölk → Mathandling; Tandläkare torsdag 14:00 → Påminnelse) bekräftar användaren. Vid osäker tolkning: undvik "Var hör detta hemma?" – föreslå bästa tolkning; lätt att ändra typ, person, datum, ångra. Systemet får inte bli jobbigt bara för att det är osäkert.
Steg: 1 Text, 2 Röst, 3 Kamera/bild, 4 Native Share Sheet. Framtid: screenshot, PDF, URL, mejl, WhatsApp, intelligent extraction. Arkitekturen får inte blockera dessa; de byggs inte alla nu.

## 9. Skola – Core
Nuläge: hämtar via iCal/WebCal (SchoolSoft, Studybee, MyClub), källan kopplas till en person, synkas automatiskt. Samma data används i Skola, Kalender, Hem, Barnets dag, notiser.

## 10. Extern data – huvudprincip
> Information som redan finns någon annanstans ska inte behöva matas in igen.

Koppla källan till person en gång, sedan **set and forget**. Vet Assistiq vems feed → koppla automatiskt. Vet inte → användaren väljer. Fel → posten ska kunna flyttas mycket enkelt. Att korrigera automation får aldrig vara jobbigare än att skapa posten manuellt.

## 11. Importerad data måste vara transparent
Metadata: source, external ID, person, senaste sync, skapad/ändrad, importtyp. UI visar diskret t.ex. "SchoolSoft"; full info i detaljläge.

## 12. Synkkrav
Idempotent; tålig mot dubletter; hanterar ändrade och borttagna events; flera feeds per barn; samma event från flera källor där möjligt; robust vid tillfälligt nätverksfel. **Manuell data får aldrig råka tas bort när en extern källa ändras.**

## 13. Barnets dag
Svarar på: *Vad gäller för Filip idag och härnäst?* Inte en generell profil. Samlar skola, aktiviteter, reminders, sysslor, kalender. Prioritet: **Idag → Behöver göras → Nästa.** Barnet behöver inte förstå var informationen skapades.

## 14. Kalender
Ersätter inte Google/Apple Calendar – familjens samlade vy över relevant Assistiq-information. Behåll månad, agenda, idag, personer, filter, typer; förenkla. Filter: person primärt, typ sekundärt. Snabbt svar på: *Vem ska vart imorgon?*

## 15. Påminnelser / Actions
Eget område, men underliggande action-modell återanvänds. Actions kan komma från användaren, skola, aktiviteter, födelsedagar, resa, framtida capture. En reminder är ett gemensamt lager för sådant som behöver göras eller kommas ihåg.

## 16. Aktiviteter
Samma integrationsprincip som Skola: koppla källa → koppla person → synka. Manuell aktivitet enkel. Importerad aktivitet ska kunna flyttas om fel person. Ingen separat integrationsarkitektur om samma source/sync-motor kan återanvändas.

## 17. Inköpslista – Supporting, hög prioritet
Inte USP men viktig för samarbete, barnens deltagande, daglig användning, retention. Behåll: flera listor, delning, kategorier, recent items, butiksläge, antal, anteckningar. Förbättra: snabb input, deduplicering, förslag om produkten redan finns, store mode. Undvik i denna fas: receptplattform, måltidsplanering, erbjudanden, lojalitetskort.

## 18. Sysslor – Supporting
Behåll: person, uppgift, återkommande, klar, valfritt vuxengodkännande, enkel historik; gärna stjärnor/veckopeng om de fungerar. Investera inte nu i achievements, leaderboard, avancerad gamification, omfattande ekonomisystem. Sysslor ska hjälpa familjen, inte bli ett eget spel.

## 19. Födelsedagar – Contextual Enhancement
Behåll datum, person, ålder, countdown, reminders, koppling till wishlist. Kontextuellt på Hem: "Tyra fyller år om 14 dagar."

## 20. Önskelistor – Contextual / Exploration
Behåll familjens listor. Extern delning utan fullt familjekonto: **säker delningslänk per lista** (WhatsApp, mejl, SMS, Share Sheet). Mottagaren ser bara den listan. Länken kan återkallas, gärna expiration, begränsad till listan.
Reservation (om implementeras): gäst anger namn, mottagaren av presenten ser inte reservationen, vuxna ser den, inget konto krävs. Valideras innan större implementation.

## 21. Resor – Contextual, scope freeze
Behåll: resa, datum, deltagare, preparation tasks, packlista, events/flyginfo, gemensamma idéer. Bygg inte: bokning, hotellmotor, kartprodukt, avancerad flight intelligence, destinationstips, expense splitting. Använd samma grundobjekt som resten där möjligt.

## 22. Familj / roller
- **Owner/Admin:** hantera familjen, bjuda in/ta bort, family settings, subscriptions.
- **Parent/Guardian:** normal full familjeåtkomst.
- **Caregiver/Adult:** begränsad vuxenåtkomst (bonusförälder, morförälder, barnvakt). Överdesigna inte rättigheter i v1.
- **Child:** begränsad åtkomst.

## 23. Barnkonto
Kan: se sin dag, relevanta aktiviteter, skola, reminders, se/hantera egna sysslor, lägga till egna relevanta saker där tillåtet. Ser inte automatiskt: vuxnas privata reminders, ekonomi, privata familjeinställningar, andra känsliga uppgifter.

## 24. "Visa som"
Behålls. Alltid mycket tydligt: "Du visar appen som Filip." Enkelt att återgå.

## 25. Språk
**Per användare**, med familjens default. Påverkar UI, e-post, notiser, WhatsApp. Datainnehåll dupliceras inte.

## 26. Notiser
Presets: **Viktigt** (endast kritiskt), **Balanserat** (standard), **Allt**. Sedan **Anpassa** för detaljer.

## 27. Notification principle
Aldrig notification fatigue. Varje notis: *Vad behöver användaren göra eller veta nu?*

## 28. WhatsApp – strategisk kanal
Kanal in och ut, inte modul.
- Steg 1 (output): relevanta reminders, viktiga förändringar, daglig/kvällssammanfattning. Admin sätter default, varje vuxen justerar.
- Steg 2: enkla actions ("Klart", "Påminn mig senare", "Gäller Oliver", "Lägg till").
- Senare: input (text, screenshot, bild, vidarebefordrat) → rätt familjeobjekt. Riktning, inte initial implementation.

## 29. AI
Inte AI för AI:ns skull. Varje AI-funktion: *Vilket manuellt familjearbete försvinner?* Oklart svar → bygg inte. Arkitekturen ska inte blockera framtida processing av text, mail, bilder, screenshots, PDF, WhatsApp, externa källor.

## 30. Inställningar
Konto · Familj · Notiser · Kalender & integrationer · Anpassa appen · Utseende · Integritet & data · Hjälp & feedback. Avancerat under **Anpassa** (färger, hemsidans moduler, navigation, detaljnotiser).

## 31. Visuellt designspråk
Behåll: mörk navy, varm orange accent, familjebilder, mjuk personlig känsla, rounded UI, luftig design. Förbättra: färre cards, färre nested containers, färre pills, tydligare hierarki, konsekventa ikoner, mindre emoji-beroende, mindre vertikalt slöseri, bättre density. Ingen redesign för redesignens skull.

## 32. Emoji och ikoner
Emoji som emotionell accent, inte primärt designsystem. Konsekvent ikonsystem för skola, aktiviteter, kalender, reminders, inköp, sysslor, resa.

## 33. Mobile-first create flows
**Vad? → Vem? → När? → Spara.** Resten bakom **Fler alternativ** (anteckningar, synlighet, avancerad upprepning, godkännande, kategori, belopp). Undantag där mer info faktiskt behövs.

## 34. PWA vs native
- **Nu i PWA:** informationsarkitektur, Hem, create-flows, navigation, cards/pills, source metadata, personkoppling, settings, filter, sync UX.
- **Native:** push, Share Sheet, kamera/capture, widgets, haptics, native sheets/pickers, background sync, bättre offline.
Webbdesign kopieras inte rakt av till native.

## 35. Offline
Native visar befintlig data utan nät. Prioritet: dagens info, kalender, inköpslista, packlista, reminders. Lokala ändringar köas och synkas; konflikter får inte ge tyst dataförlust.

## 36. Integritet och barn
Privacy by design, minimera data, extra försiktighet med barn. Stöd för: rollbaserad åtkomst, dataexport, kontoradering, source transparency, samtycke där det behövs, minimal datainsamling, radering av familjemedlemsdata. Ingen känslig info samlas "för framtiden".

## 37. Accessibility (minimum inför native)
Färgkontrast, färg inte enda signal, Dynamic Type, VoiceOver-labels, stora touch targets, dark mode, reduced motion, tillgängliga kalenderindikatorer, ikoner med semantisk label.

## 38. Analytics
På större flöden, privacy-safe, utan onödig persondata. Metrics: time to first value, connected source rate, automatic capture rate, correction rate, second adult activation, child activation, notification action rate, D7/D30 **household** retention.

## 39. North Star
**Weekly Coordinated Households** – hushåll där Assistiq under veckan hjälpt flera personer koordinera. Exakt definition när eventmodellen finns.

## 40. Affärsmål (ordning)
1 Minska manuell administration, 2 återkommande värde, 3 household retention, 4 därefter betalning. Registreringar utan retention är inte framgång.

## 41. Free / Pro (endast hypotes, ingen betalvägg nu)
Free: grundfamilj, kalender, manuella reminders, grundläggande inköp och sysslor. Pro: avancerade integrationer, automation, fler källor, WhatsApp, avancerad capture, premium family automation.

## 42. Feature classification
- **Core MVP:** Hem, Quick Capture text, familj/personmodell, Barnets dag, Kalender, Reminders/actions, Skola, externa iCal/WebCal, aktiviteter, source/person association, notiser, enkel onboarding.
- **Enhancement:** Inköp, Sysslor, Födelsedagar, UI-personalisering, avancerade notisinställningar.
- **Exploration:** röst-, kamera-, Share Sheet-capture, extern wishlist-delning, WhatsApp actions, intelligent preparation, AI extraction.
- **Later:** WhatsApp input, mail/PDF/screenshot, tablet family hub, avancerad AI, vidare reseutveckling.
- **Kill / bygg inte nu:** family chat, budgetsystem, location tracking, meal planning, receptplattform, full resebokning, kartprodukt, avancerad chore-gamification, full kalenderersättare.

## 43. Utvecklingsplan – separata etapper, inte allt samtidigt
- **Etapp 0 – Foundations:** kontrollera/modellera Person, Event, Action, List, Source, Context, Role, Visibility. Återanvänd, ingen stor backend-rewrite utan behov. Säkerställ source metadata, external IDs, person association, sync semantics, permissions, språk per användare, analytics-arkitektur. *Exit:* teamet kan beskriva hur SchoolSoft-event → Filip → Kalender → Hem → Barnets dag fungerar utan duplicerad information.
- **Etapp 1 – Home + Quick Capture:** Home 2.0, mindre header, Quick Capture, Idag, Behöver din uppmärksamhet, Nästa per barn, navigation, förenklad hierarki. *Acceptans:* förälder förstår inom ~5 s vad som händer idag, om något kräver handling, vad varje barn har härnäst. Quick Capture lägger till vanligt objekt utan modulval.
- **Etapp 2 – Person + School + Activity data:** source management, SchoolSoft, Studybee, MyClub, generell iCal/WebCal, personkoppling, flytta felkopplad post, source transparency, sync- och error states. *Acceptans:* källa kopplas en gång och synkar; importerad post flyttas med minimal interaktion; källan syns; dubletter undviks.
- **Etapp 3 – Calendar + Child Day + Actions:** förenkla kalender, person-first filter, Barnets dag, unified actions, koppling kalenderdata ↔ handlingar. *Acceptans:* snabbt se hela familjen, ett barn, vad som ska göras; ingen data skapas på flera ställen.
- **Etapp 4 – Supporting:** Inköp (polish, dedupe, snabbare capture), Sysslor (enklare tilldelning/klart), Födelsedagar (Home + reminders). Ingen stor scope-expansion.
- **Etapp 5 – Contextual:** wishlist sharing-experiment, kontextuella födelsedagar och resor, entry points. Resor byggs inte ut.
- **Etapp 6 – Native:** offline, push, share sheet, röst, kamera, native interactions, widgets där tydlig nytta.
- **Etapp 7 – WhatsApp V1:** efter teknisk och kostnadsutredning. Reminders, viktiga förändringar, sammanfattning, preferenser, opt-in/out, family defaults. Ingen chatbot.

## 44. UX quality bar
1 Förstår användaren direkt vad den är till för? 2 Kan vanligaste handlingen göras utan instruktion? 3 Måste användaren förstå vår interna kategorisering? (ja → förenkla) 4 Kan befintlig data återanvändas? 5 Kan funktionen döljas tills relevant? 6 Kan fel enkelt korrigeras? 7 Tydlig feedback efter handling? 8 Fungerar med en hand på mobil?

## 45. Technical principles
Reuse before rebuild · No premature abstraction · One source of truth · Automation must be reversible (förstå, korrigera, ångra) · External data retains provenance · Failure must be visible.

## 46. Out of scope för hela initiativet (utan separat beslut)
Family messaging/chat, meal planner, recept, budget, location tracking, full reseplattform, marketplace, socialt nätverk, avancerad AI-assistent, chatbot-personlighet, komplex gamification, komplex behörighetsmatris, komplett Google/Apple Calendar-konkurrent.

## 47. Validation (för större förändringar)
Hypothesis · Metric · Continue-signal · Stop/change-signal.

## 48. Exempel – Home 2.0
Hypotes: Hem som prioriterar relevant info framför moduler → familjen förstår snabbare. Metrics: Home → action, time to first useful interaction, reminder completion, child view opens, return frequency. Fortsätt: snabbare till relevant info, ökat engagemang utan ökad förvirring.

## 49. Exempel – externa skol-/aktivitetskällor
Hypotes: automatisk extern data minskar administration och ökar retention. Metrics: connection rate, sync success, correction rate, source retention, D30 connected vs non-connected. Önskad signal: familjer med minst en källa har tydligt högre retention.

## 50. Slutprincip
Vi bygger inte appen med flest funktioner, utan den där familjen behöver tänka minst på administrationen av vardagen. Assistiq ska kännas **obvious, fast, lightweight, trustworthy, family-aware, low friction.** Finns informationen någon annanstans – hämta den. Vet vi vem den gäller – koppla den. Vet vi när den är relevant – visa den. Behöver något göras – hjälp rätt person att göra det.
