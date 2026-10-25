# Nästa steg – Assistiq (Reminder for Simplicity)

**Uppdaterad:** 2026-10-25 kväll, efter att masterbriefens etapp 0–7 genomförts så långt webbappen räcker (`RELEASE_2026-10-25.md`, `-25b`, `-25c`, `-25d`).
**Underlag:** `ASSISTIQ_MASTERBRIEF.md` (riktningen), `ROADMAP.md` ("Masterbriefens etapper" med status per etapp), `LAUNCH_CHECKLIST.md` (vad som blockerar lansering).
**Grundregel för allt nedan:** de befintliga användarnas data är orörd. Bara nya tabeller, kolumner och enum-värden, ingen backfill utan eget beslut och export först (`OPERATIONS.md` §5b). Ingens befintliga val ändras av sig självt.

---

## A. Beslut och åtgärder för Mikael

| # | Vad | Varför |
|---|---|---|
| A1 | **Delningslänk för önskelistan:** slå på `FEATURE_WISHLIST_LINK` i Vercel, eller låt den vara av | Briefen (§20) rekommenderar länk utan konto. Du beslutade 2 aug att konto krävs. Funktionen är byggd och klar, men av (`RELEASE_2026-10-25d.md` §6). Prova gärna först i Preview |
| A2 | **WhatsApp V1:** bolag, Meta Business-konto, avsändarnummer, mallar, budget | `WHATSAPP_PLAN.md` §6. Ungefär 15 kr per hushåll och månad med daglig sammanfattning, så det passar i Pro |
| A3 | **Testdatabas** (ett andra Supabase-projekt eller en branch, med påhittad data) | Behövs för B1 och gör framtida databassteg säkrare för de riktiga användarna |
| A4 | Uppdatera `/privacy` (sv och en): produktanalys (#14), röstinmatning (#15), eventuellt önskelistelänken. Höj `CONSENT_VERSION` | `GDPR.md` §5 |
| A5 | Klicktesta `TEST_VERIFICATION.md` §34–35 på riktig data | Allt är testat med testdata och axe, inte mot riktiga familjer |
| A6 | 5-sekunderstestet (Etapp 1) med 3–5 föräldrar | Briefens acceptanskriterium för Hem. Kan inte mätas i koden |
| A7 | Runt 22 nov: bestäm Free/Pro med nyckeltalen (Admin → Nyckeltal) som underlag | §40–41: kvarhållning före betalning. D30 har data först 24 nov |
| A8 | Gör GitHub-repot privat om koden inte ska vara öppen | Repot är publikt. Inga nycklar ligger där |

---

## B. Bygg – kvar efter 25 okt, i den här ordningen

### B1. Sammanslagen synkmotor (rest av G3 · medel · ingen databasändring, men skriver i riktig data)
- **Förutsättning:** A3. Spara 5–10 riktiga ICS-flöden som testfall, avidentifierade (SchoolSoft, Studybee, Unikum/Vklass, MyClub, Laget/SportAdmin).
- En motor `lib/feedSync.ts` med två uttalade matchningsstrategier: skolans "per barn över alla länkar" och aktiviteternas "per länk".
- **Testfall som ska ge samma resultat som i dag:**
  - ändrad tid,
  - flyttat datum,
  - inställt,
  - samma UID i två länkar,
  - redigerad eller dold post,
  - flyttad person,
  - "[Nej]"-svar i MyClub,
  - lektioner som filtreras bort,
  - att poster gjorda för hand aldrig rörs.
- Sedan kan äldre städning som skriver i data vid uppstart tas bort ("Lektion"-poster, MyClub-titlar).
- **Mått:** lyckade synkar och rättade importer på Nyckeltal, oförändrade eller bättre.

### B2. Samma händelse från två olika typer av källor (Etapp 2 · litet–medel)
Samma match kan komma både från skolans kalender och från klubbens. Visa den en gång, med båda källorna. Matchning på titel, datum och tid inom samma barn. Görs efter B1.

### B3. Roller v1.1 (§22 · litet)
- Byt roll på en befintlig medlem under Familjemedlemmar (bara administratören).
- Dölj knappar som barnvakten inte får använda (servern säger redan nej).
- Låt barnvakten ta skjuts i I morgon-kortet.

### B4. Kamera-capture för fler än veckobrevet (§8 steg 3 · litet när `ANTHROPIC_API_KEY` finns)
Skanningen av veckobrev finns redan, men är dold tills nyckeln sätts i Vercel. Därefter: kameraknappen tolkar även skärmdumpar (t.ex. en inbjudan i WhatsApp) och leder till samma förhandsvisning som "Skriv vad som helst".

### B5. Fler ytor i ikonsystemet (§32 · litet, kan tas löpande)
`components/icons.tsx` används på de nya ytorna. Skollistan (📝/🧪), I morgon-kortet och Mer har fortfarande egna ikoner eller emoji. Byt när de ändå ändras.

### B6. Native-appen (Etapp 6 · stort, eget projekt)
`APP_STORE_READINESS.md`. Det som återstår efter webbappen:
- riktig offline för dagens info och kalendern,
- Share Sheet på iPhone,
- widgets,
- native-väljare,
- bakgrundssynk.

### B7. WhatsApp V1 (Etapp 7 · ungefär 2 dagar när A2 är klart)
`WHATSAPP_PLAN.md` §3–5. En tredje kanal bredvid mejl och push, bakom `FEATURE_WHATSAPP`.

---

## C. Kända begränsningar (25 okt)

- Synkmotorerna är fortfarande två (B1).
- En hel länk kan inte flyttas till ett annat barn, bara enskilda poster, eftersom det annars blir dubbletter. Det löses med B1.
- Barnvakten ser knappar för sådant hen inte får göra (B3).
- Avbockade engångspåminnelser försvinner ur appens kalender men finns kvar i den utgående kalenderlänken till Google eller Apple. Det är medvetet.
- Offline: en sida som inte redan är öppen går inte att öppna utan nät. Familjedata cachas med flit inte på telefonen (beslut 4 okt).
- "Dela till appen" fungerar inte på iPhone (Apple stöder det inte för webbappar).
- Nyckeltalen räknas från 25 okt. Byts `NEXTAUTH_SECRET` börjar kvarhållningen om.

---

## D. Mått att följa (Admin → Nyckeltal)

| Mått | Varför (briefen) | Signal att reagera på |
|---|---|---|
| Samordnade hushåll (7 d) ★ | North Star §39 | Ska öka vecka för vecka |
| Kvarhållning D7/D30 | §38, §40 | Hushåll med kopplad källa ska ligga tydligt högre (§49) |
| Kopplad källa | §38 | Låg andel betyder att "Koppla skolan" ska komma tidigare i onboardingen |
| Rättade importer | §38 | Hög andel betyder att automatiken gissar fel. Titta på `how` (move, edit, hide) |
| Öppnade notiser | §38 | Om andelen sjunker: gör Balanserat till standard för nya användare, eller skicka färre |
| Automatiskt inhämtat | §38 | Ska öka. Det är produktlöftet |
| Andra vuxen / Barn aktiva | §38 | Låg andel betyder att inbjudan behöver bli enklare |
