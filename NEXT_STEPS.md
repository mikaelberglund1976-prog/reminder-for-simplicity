# Nästa steg – Assistiq (Reminder for Simplicity)

**Skapad:** 2026-10-25, efter att masterbriefens Etapp 0 gått live (`RELEASE_2026-10-25.md`, `-25b.md`, `-25c.md`).
**Underlag:** `ASSISTIQ_MASTERBRIEF.md` (riktningen), `ROADMAP.md` ("Masterbriefens etapper", status per etapp), `LAUNCH_CHECKLIST.md` (vad som blockerar lansering).
**Grundregel för allt nedan:** de befintliga användarnas data är orörd. Varje steg får bara lägga till tabeller, kolumner eller enum-värden, och ingen backfill görs utan eget beslut och export först (`OPERATIONS.md` §5b).

Varje steg anger varför det behövs (koppling till briefen), ungefär hur stort det är, om det rör databasen, och hur vi ser att det fungerade (briefens §47: hypotes, mått, fortsätt/stoppa).

---

## A. Kräver Mikael

| # | Vad | Varför |
|---|---|---|
| A1 | Uppdatera `/privacy` (sv + en) med produktanalysen (`GDPR.md` #14) och höj `CONSENT_VERSION` | Analysen är live sedan 24–25 okt och ska beskrivas för användarna |
| A2 | Gör GitHub-repot privat (om koden inte ska vara öppen) | Repot `reminder-for-simplicity` är publikt. Inga nycklar ligger där, men koden kan läsas av vem som helst |
| A3 | Klicktesta `TEST_VERIFICATION.md` §34 på riktig data, särskilt att flytta en importerad post och att bocka av en påminnelse | Allt är verifierat med testdata, inte mot riktiga familjer |
| A4 | Ta beslut om en **testdatabas** (ett andra Supabase-projekt eller en branch, med påhittad data) | Låser upp B2 och gör framtida databassteg säkrare för de riktiga användarna |
| A5 | 5-sekunderstestet (Etapp 1) med 3–5 föräldrar: "Vad händer i dag? Behöver något göras? Vad har varje barn härnäst?" | Briefens acceptanskriterium för Hem. Kan inte mätas i koden |
| A6 | Efter ca 4 veckor med nyckeltal (runt 22 nov): bestäm Free/Pro (rad 53) | Briefen §40–41: retention före betalning. D30 har data först 24 nov |

---

## B. Bygg – i den här ordningen

### B1. Påminnelser kopplade till notiser – mät effekten och inför förval (Etapp 0/3 · litet–medel · ingen databasändring)
- **Mått:** lägg till `notification_opened` i service workern (`public/sw.js`, `notificationclick`) och `notification_sent` där push skickas, så att "Notification action rate" (§38) kan räknas på Admin → Nyckeltal.
- **Förval (§26):** tre val, *Viktigt / Balanserat / Allt*, plus *Anpassa* för dagens detaljval i `NotifyPrefsCard`. Förvalen skriver samma värden som de detaljerade valen, så inga nya tabeller behövs.
- **Hypotes:** färre och mer träffsäkra notiser ger fler som öppnas. **Fortsätt** om andelen öppnade notiser ökar. **Ändra** om fler stänger av push helt.

### B2. Sammanslagen synkmotor (rest av G3, Etapp 2 · medel · ingen databasändring, men skriver i riktig data)
- **Förutsättning:** A4 (testdatabas). Spara 5–10 riktiga ICS-flöden som testfall, avidentifierade (SchoolSoft, Studybee, MyClub, Laget/SportAdmin).
- **Gör:** en motor `lib/feedSync.ts`: hämta → tolka → matcha UID → skapa/uppdatera/avaktivera → ändringsvakt. Varje källtyp bidrar med sin hämtning, tolkning och mappning. Skolans "per barn över alla länkar"-matchning och aktiviteternas "per länk"-matchning blir två uttalade strategier.
- **Testfall som måste ge exakt samma resultat som i dag:**
  - ändrad tid,
  - flyttat datum,
  - inställt,
  - samma UID i två länkar,
  - redigerad eller dold post,
  - flyttad person,
  - "[Nej]"-svar i MyClub,
  - lektioner som filtreras bort,
  - att poster gjorda för hand aldrig rörs.
- **Mått:** `sync_result`, alltså lyckade synkar och rättade importer på Admin → Nyckeltal, ska vara oförändrade eller bättre.

### B3. En sida för familjens källor (Etapp 2 · medel · ingen databasändring)
- `/dashboard/sources` (nås från Inställningar → Kalender & integrationer, §30) visar alla länkar via `listSources()`: barn, källa, senaste synk, status och antal poster, med *Synka nu*, *Byt barn* och *Koppla bort*. Dagens kort under Skola och Aktiviteter kan finnas kvar som genvägar.
- Generell iCal/WebCal även för skola, alltså andra plattformar än SchoolSoft och Studybee.
- **Samma händelse från två källor (§12):** visa den en gång, med båda källorna.

### B4. Kalender, Barnets dag och gemensamma åtgärder (Etapp 3 · medel–stort)
- **Kalender (§14):** person först. Personfiltret finns, så gör det till en rad överst ("Vem ska vart i morgon?"). Typfiltret flyttas bakom *Filter*.
- **Barnets dag (§13):** ordningen *I dag → Behöver göras → Nästa* på samma sida som föräldern öppnar.
- **Gemensamma åtgärder (§15):** samma "Klart"-modell (`completedAt`) för skola, påminnelser och födelsedagar. Därefter föreslagna åtgärder, t.ex. en födelsedag om 14 dagar som ger "Köp present till Tyra" kopplat till önskelistan.

### B5. Roller v1.1 (§22 · litet)
- Byt roll på en befintlig medlem under Familjemedlemmar, bara för administratören.
- Dölj knappar som barnvakten inte får använda (servern säger redan nej).
- Låt barnvakten ta skjuts i I morgon-kortet (i dag räknas den inte som vuxen där).

### B6. Etapp 4 – Inköp, Sysslor, Födelsedagar (litet–medel)
- **Inköp (§17):** "Mjölk finns redan på listan" i stället för en dubblett, och snabbare inmatning.
- **Sysslor (§18):** tilldela och bocka av i färre steg. Ingen ny spelifiering.
- **Födelsedagar (§19):** "Tyra fyller år om 14 dagar" i *Behöver din uppmärksamhet* eller som rad på Hem när det är under 14 dagar kvar (Hem visar i dag de två närmaste under Kommande).

### B7. Etapp 5 – Delningslänk för önskelista (§20 · medel · ny tabell)
- I dag delas önskelistan med släkt via inbjudan och inloggning (`wishlist_guests`). Briefen vill ha en **länk per lista utan konto**, som kan återkallas och gärna har ett utgångsdatum.
- Gästen reserverar med bara ett namn, och barnet ser aldrig reservationen.
- Validera med 2–3 familjer först, eftersom briefen säger att detta ska valideras innan större bygge.

### B8. Quick Capture steg 2 – röst (§8 · litet i PWA)
Mikrofonknapp i "Skriv vad som helst" (Web Speech API där webbläsaren stöder den). Texten går in i samma tolkning som i dag. Mått: `quick_capture_saved` per typ.

### B9. Etapp 6 – Native och Etapp 7 – WhatsApp
- **Native:** se `APP_STORE_READINESS.md`. Push, Share Sheet, offline för dagens info, inköpslistan och packlistan.
- **WhatsApp:** börja med en kostnads- och teknikutredning (Meta Cloud API, mallar, opt-in). V1 = bara utgående meddelanden: påminnelser, ändringar och en kvällssammanfattning.

---

## C. Kända begränsningar från 25 okt

- Synkmotorerna är fortfarande två (se B2). Ändringar som berör båda måste göras på två ställen.
- Barnvakten ser knappar för sådant hen inte får göra, och servern svarar då med ett fel (B5).
- Avbockade engångspåminnelser försvinner ur appens kalender men finns kvar i det utgående kalenderflödet (ICS) till Google eller Apple. Det är medvetet: händelsen ägde rum.
- Nyckeltalen räknas från 25 okt. Byts `NEXTAUTH_SECRET` bryts pseudonymerna och kvarhållningen börjar om (`OPERATIONS.md` §3d).
- Äldre städning vid uppstart som skriver i data finns kvar ("Lektion"-poster och MyClub-titlar). Den är idempotent men strider mot grundregeln och ska inte byggas på. Den kan tas bort när B2 finns.

---

## D. Mått att följa (Admin → Nyckeltal)

| Mått | Varför (briefen) | Signal att reagera på |
|---|---|---|
| Samordnade hushåll (7 d) ★ | North Star §39 | Ska öka vecka för vecka när familjer bjuder in fler |
| Kvarhållning D7/D30 | §38, §40 | Jämför hushåll med kopplad källa och hushåll utan (hypotes §49: med källa ska ligga tydligt högre) |
| Kopplad källa | §38 | Låg andel betyder att onboardingen ska leda till "Koppla skolan" tidigare |
| Rättade importer | §38 "correction rate" | Hög andel betyder att automatiken gissar fel. Titta på `how` (move, edit, hide) |
| Automatiskt inhämtat | §38 | Ska öka. Det är produktlöftet |
| Andra vuxen / Barn aktiva | §38 | Låg andel betyder att inbjudan behöver bli enklare |
