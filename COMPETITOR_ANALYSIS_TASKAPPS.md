# Konkurrentanalys – Reminder-/uppgifts-/vane-appar (Bring!, TickTick, Todoist, Do Habits, Structured)

**Datum:** 2026-08-02
**Metod:** Genomgång av onboarding, kärnvyer och nyckelflöden via skärmdumpar (Planny ej analyserad – inga skärmdumpar mottagna).
**Relation till tidigare analys:** fristående runda, inte samma som `COMPETITOR_ANALYSIS_BEST4FAMILY.md` (2026-07-28). Den analysen tittade på breda familjehub-konkurrenter (Best4Family, 18 moduler). Den här tittar på renodlade reminder/uppgifts/vane-appar – fokus på *användarvänlighet och onboarding-mönster*, inte funktionsbredd.
**Syfte:** ta lärdom av de bästa UX-mönstren, inte kopiera funktionsytan. Vår positionering (`PRODUCT_SPEC.md` §3) är uttryckligen att vi **inte** konkurrerar med Todoist/TickTick som generella uppgiftshanterare – så den här analysen är filtrerad genom den linsen, se §5 nedan.

---

## 1. Sammanfattande ranking – användarvänlighet

| Rank | App | Styrka | Svaghet |
|---|---|---|---|
| 1 | **Bring!** | Extremt lågt tröskelvärde att lägga till en vara (prediktiva förslag, snabbtryck). Onboarding är kort och konkret (namnge lista → bjud in). Renodlat fokus = inget att bli förvirrad av. | Smalt användningsområde (bara inköp), skalar inte till uppgifter/vanor. |
| 2 | **Structured** | Tidslinjevyn är genuint differentierande — ger en känsla av "min dag" snarare än "min lista". Interaktiv onboarding (planera direkt) skapar snabbt värde. Placeholder mode för skärmdumpar visar produkttänk kring integritet. | Tung paywall direkt efter onboarding, innan användaren hunnit uppleva värdet själv. |
| 3 | **Todoist** | Väletablerad, ren informationsarkitektur (Inkorg/Idag/Kommande/Bläddra). Motiverande "redan uppnått"-checklista i onboarding är smart psykologi. Konfetti vid första avklarade uppgift bygger vana tidigt. | Generisk startvy ("Inkorg") ger inte omedelbar överblick över dagen. |
| 4 | **TickTick** | Bred funktionspalett (kalender, Eisenhower-matris, vanor, nedräkning, pomodoro) samlad under en enda app — bra för en "allt-i-ett"-ambition. Färgtema-val ger personlig känsla tidigt. | Så många funktioner exponerade redan i onboarding att det riskerar kognitiv overload för en ny användare. |
| 5 | **Do Habits** | Tydlig, smal produkt (endast vanor). Bra differentiering mellan binära och kvantitativa vanor i UI. | Hård säljande paywall direkt efter onboarding, innan en enda vana testats — högst friktion av alla analyserade appar. |

**Kärninsikt:** De mest användarvänliga apparna (Bring!, Structured) lyckas visa/leverera värde *innan* de ber om något (inloggning, betalning, konfiguration). De minst användarvänliga (Do Habits) säljer innan de bevisat värde.

---

## 2. Fullständig funktionsinventering

### Inköp / listor (Bring!)
- Delade listor med avatarer per medlem + "bjud in"-knapp direkt på listkortet
- Flera listor samtidigt, mallbaserade förslag ("Den andra butiken", "Din nästa fest", "På din arbetsplats")
- Prediktiva/vanebaserade varuförslag ("Du behöver troligen") med ikon per vara
- Snabbtillägg via understruken tap, inte bara textinmatning
- Delningsflöde via WhatsApp/SMS/e-post/kontakt vid onboarding

### Uppgifter / att-göra (TickTick, Todoist, Structured)
- Dagsgrupperad lista (Idag/Imorgon) med klockslag
- Checkbox + färgkodning per prioritet/kategori
- Kalendervy: Dag/Vecka/Månad, färgade streck under datum istället för siffror
- Eisenhower-matris (2x2 brådskande/viktigt) med drag-mellan-kvadranter
- Nedräkning till specifika datum (födelsedagar, deadlines), kortbaserad med bild
- Standardprojekt "Inkorg" som fångstplats för allt nytt
- Bulk-hantering: markera flera uppgifter, kommentarer per uppgift, aktivitetslogg/historik
- E-posta uppgifter till ett projekt (skapa uppgift via mejl)
- Tidslinjevy med tidsspann per aktivitet + delmål/checklista inuti en uppgift (Structured)
- Veckoöversikt med aktivitetspunkter ovanför tidslinjen

### Vanor (TickTick, Do Habits)
- Heatmap/streak-vy (GitHub-contribution-stil) per vana
- Binära vanor (klar/inte klar) vs kvantitativa vanor (X av Y, med snabb "+"-knapp)
- Kuraterat bibliotek av populära vanor att välja från (namn, ikon, kort beskrivning)
- Auto-synk med Apple Health för vissa vanor (steg, träning, sömn)
- Mål-konfiguration: antal gånger/dag, frekvens, tid på dagen (morgon/eftermiddag/kväll/hela dagen)
- Reminders per vana, "Advanced settings" för djupare anpassning
- Vanearkiv, "Achievements" (gamification)

### Produktivitetsverktyg (TickTick)
- Pomodoro-timer inbyggd ("Pomo: Beat procrastination")

### Generella plattformsfunktioner (flera appar)
- Kalenderintegration (import/export, koppling till native Reminders/Calendar)
- Molnsynkronisering
- Anpassade notiser/påminnelser, "smarta" påminnelser (t.ex. om inget avklarats på länge)
- Widgetstöd
- Export/backup av data
- Integritetsfunktion: dölj innehåll för skärmdumpar (Structured)

### Onboarding-mönster (återkommande across apps)
- "Hoppa över"-möjlighet på varje steg, aldrig tvingande
- Progress-indikator (dots eller "Steg X av Y")
- Inloggning via Apple/Google/Facebook/e-post som standard
- Segmenteringsfråga ("på egen hand" vs "med team") för att skräddarsy upplevelsen
- Redan-uppnått-checklista för att skapa momentum (Todoist)
- Interaktivt första-steg: låt användaren göra en riktig handling direkt (Structured, Bring!)
- Färg/tema-val för personlig känsla (TickTick)

### Monetiseringsmönster
- Gratis-vs-Pro-jämförelsetabell, tydligt vad som låses
- Tidslinje-visualisering av provperioden med exakt debiteringsdatum (Structured — mest transparent)
- Rabatterat introduspris första perioden, sen högre standardpris
- Socialt bevis (App of the Day, stjärnbetyg, antal recensioner) i paywall
- Placering: antingen direkt efter onboarding (Do Habits, Structured) eller mer diskret inbäddad i inställningar (TickTick, Todoist)

---

## 3. Generella rekommendationer (källa: analysen, ej filtrerat mot vår app ännu — se §5 för det)

1. **Visa värde innan ni ber om något.** Bring! och Structured vinner för att de låter användaren uppleva kärnfunktionen (lägga till en vara / planera en dag) innan konto, betalning eller lång konfiguration. Undvik Do Habits-mönstret (hård paywall innan en enda funktion testats).
2. **Ett tydligt förstaintryck, inte hela funktionsytan.** TickTick visar hela sin bredd redan i onboarding vilket kan kännas överväldigande.
3. **Prediktiva förslag är starkt värde för inköpslistor specifikt** (Bring!s "Du behöver troligen").
4. **Delning bör vara enkel och tidig** — Bring!s "bjud in till listan"-flöde direkt i onboarding, med flera kanaler (WhatsApp/SMS/mejl).
5. **Differentiera binära vs kvantitativa uppgifter/vanor i UI** (Do Habits).
6. **Tidslinjevy är en stark, mindre vanlig differentiator** (Structured).
7. **Gamification i små doser bygger vana**: konfetti vid första avklarade uppgift (Todoist), streak-heatmaps (vanor) — billigt att implementera, starkt beteendemässigt track record.
8. **Om betalmodell**: var transparent kring debitering som Structured, snarare än en aggressiv hård sälj-skärm som Do Habits.
9. **Praktisk integritetsdetalj värd att stjäla**: "Placeholder mode" (Structured) — döljer uppgiftsnamn för skärmdumpar.
10. **Inställningsstruktur**: gruppera inställningar tydligt per domän (App / Notiser / Integritet / Konto), som Structured.

---

## 4. Öppna frågor (generella, från analysen)

- Ska er app ha *en* huvudvy (t.ex. tidslinje) eller flera jämställda flikar (lista/kalender/vanor) som TickTick?
- Hur bred ska funktionsytan vara vid lansering — smalt & vasst (Bring!, Do Habits) eller brett från start (TickTick)?
- Delning: peer-to-peer (Bring!s partner-koncept) eller mer allmän listdelning (Todoist-projekt)?
- Monetisering: freemium med tydlig gräns, eller allt gratis initialt för att bygga användarbas?

*→ För oss är dessa i stort redan besvarade av positioneringen i `PRODUCT_SPEC.md` §3: en huvudingång kopplad till hushållet (inte jämställda generella flikar), smalt & vasst från start, delning är hushålls-/listbaserad (redan byggt, se 4b.15), och `is_pro`/`FamilyTrial` är redan vår modell (manuell idag, Stripe inte byggt än).*

---

## 5. Syntes för Reminder for Simplicity (2026-08-02) — vad vi redan har vs. genuina luckor

Korsreferens mot nuläget i `PRODUCT_SPEC.md` innan något läggs till som "att bygga". Filtrerat enligt beslut: **breda task-manager-funktioner som inte stärker "hemmets gemensamma bas" (§3) exkluderas helt** — inte parkerade, bara bortvalda.

**Explicit exkluderat (passar inte positioneringen):** Eisenhower-matris, Pomodoro-timer, fristående vanebibliotek/heatmap som egen modul, tidslinjevy à la Structured, e-posta-uppgift-till-projekt, bulk-hantering/kommentarer per post, "Achievements"-system. Dessa hör hemma i en generell uppgiftshanterare, inte i vår app.

**Redan byggt / redan löst (ingen ny kod):**
- Snabbval/quick-add (§4.2 i specen) — matchar "snabbtillägg framför formulär"-principen redan.
- Delad inköpslista med kategori-minne, Recent-chips, streckkodsskanning, butiksläge (4b.14, 4b.27) — täcker en stor del av Bring!s styrka.
- Flera listor per hushåll med åtkomststyrning (4b.15) — täcker Todoist-projekt-mönstret.
- Sekretess-chip per post (4b.16) — en lättviktsvariant av "Placeholder mode"-tanken, fast synlig istället för dold.

**P0/P1 – låg komplexitet, starkt fit, bör bli nästa "quick wins"-omgång:**
1. **Micro-gratifikation vid första avklarade item.** Konfetti/liknande vid första avbockade reminder och första godkända syssla (Todoist-mönstret). Ren frontend, ingen databasändring.
2. **Kvantitativ vy för återkommande sysslor** ("3 av 5 denna vecka"). Datan finns redan (`ChoreCompletion` + `choreRecurrenceDays`/`recurrence`) — det här är en UI-komponent, inte en ny modell.
3. **Klicktesta det faktiska onboarding-flödet från Register.** Specen beskriver inte idag vad som händer mellan registrering och första riktiga värde (en tillagd påminnelse/vara). Innan vi bygger något nytt bör vi dokumentera nuläget och jämföra mot "visa värde innan ni ber om något".

**P2 – naturlig utökning, lägre prioritet:**
4. **Streak/"gjort över tid"-indikator för sysslor** — kan återanvända `/api/family/stats` som redan finns (4b.26).
5. **Riktigt prediktiva "du behöver troligen"-förslag** på inköpslistan (utöver dagens kategori-minne) — kräver ny inköpsfrekvens-logik, större jobb än övriga punkter här.
6. **"Placeholder mode" för skärmdumpar**, särskilt för önskelistan (barnets överraskningar) — nischat men billigt.

**Avstämt (2026-08-02) — var en öppen spänning, nu löst:**
7. Bring!s starkaste konkurrensfördel är enkel, tidig delning — men Mikael bekräftade att den dolda länken var ett medvetet val: samarbete ska kräva inloggning/konto, inte en anonym länk. Genomgången gav en konkret ny funktion istället: en **"Guest"-roll** som delar en enskild lista med någon utanför hushållet (mor-/farföräldrar, granne/barnvakt) via inloggningsbaserad inbjudan, utan full hushållsåtkomst. Se `PRODUCT_SPEC.md` 4b.31 och `TODO.md` punkt 23.

**Framåtblick, ingen kod nu:**
8. Transparent provperiods-/debiteringstidslinje (à la Structured) som princip **när** Stripe-checkout byggs (Fas 3, se `ROADMAP.md`). Inte aktuellt förrän betalflödet finns — `is_pro` är fortfarande en manuell admin-toggle (4b.6).

Se `TODO.md` punkt 22 för handlingslistan och `PRODUCT_SPEC.md` §9 + 4b.30 för hur detta är inarbetat i produktspecen.
