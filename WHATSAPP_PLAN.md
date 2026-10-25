# WhatsApp V1 – utredning och plan (masterbrief §28, Etapp 7)

**Skapad:** 2026-10-25. **Status:** utredning klar. Bygget väntar på Mikaels beslut och konton (avsnitt 6). Inget WhatsApp-relaterat finns i appen än.

Briefen säger att WhatsApp är en **kanal in och ut ur Assistiq, inte en modul**, och att V1 bara gäller utgående meddelanden: påminnelser, viktiga ändringar och en kvälls- eller dagssammanfattning. Admin sätter standard, varje vuxen justerar sitt och väljer opt-in/opt-out. Ingen chatbot.

---

## 1. Vad som krävs hos Meta (WhatsApp Business Platform, Cloud API)

- **Ett Meta Business-konto (Business Manager) som är verifierat.** Det kräver normalt ett registrerat företag (organisationsnummer, adress, webbplats). Det hänger ihop med lanseringslistans rad 9–11 om bolag.
- **Ett eget telefonnummer** för avsändaren som inte används i vanliga WhatsApp, och ett **visningsnamn** som Meta godkänner ("Assistiq").
- **Mallar (templates):** allt vi skickar utan att användaren skrivit först måste vara en mall som Meta godkänt i förväg, på varje språk (sv och en). Påminnelser, ändringar och sammanfattningar är kategorin **utility**.
- **Opt-in:** användaren måste aktivt ha valt att få meddelanden på WhatsApp från oss, och kunna sluta enkelt.

## 2. Kostnad

- Sedan 1 juli 2025 tar Meta betalt **per levererat meddelande** efter kategori och mottagarland. Sedan **1 okt 2026 kostar även utility-mallar inom 24-timmarsfönstret**. Förut var de gratis där. ([Meta, pricing](https://developers.facebook.com/docs/whatsapp/pricing), [respond.io](https://respond.io/blog/whatsapp-pricing-change-2026.md))
- **Sverige, utility:** ungefär **0,017 USD per meddelande** enligt en tredjepartskalkylator, verifierad sept 2026 ([whautomate](https://whautomate.com/whatsapp-business-api-pricing)). Det exakta priset står i Metas rate card för Sverige, så kontrollera det innan beslut.
- **Uppskattning per hushåll:** två vuxna, en kvällssammanfattning varje dag och ungefär tre påminnelser eller ändringar i veckan ger ungefär 2 × (30 + 12) ≈ 84 meddelanden i månaden. Det blir **ungefär 1,4 USD (ungefär 15 kr) per hushåll och månad**. Utan daglig sammanfattning blir det ungefär 25 meddelanden, alltså ungefär 0,4 USD.
- **Slutsats:** WhatsApp hör hemma i **Pro** (briefen §41 har det som en Pro-hypotes). Standard bör vara *påminnelser och ändringar*, med sammanfattningen som eget val. Annars äter den en stor del av Pro-priset.

## 3. Arkitektur – en tredje kanal bredvid mejl och push

Appen har redan rätt struktur. Varje utskick har en **typ** (`reminders`, `school`, `activities`, `birthdays`, `tomorrow`, `changes`), och varje person väljer kanal per typ (`lib/notifyPrefs.ts` för mejl, `lib/webPush.ts` för push, förvalen Viktigt/Balanserat/Allt sedan 25 okt). WhatsApp blir en tredje kanal på samma ställe:

| Del | Ny | Bygger på |
|---|---|---|
| `lib/whatsapp.ts` | `sendWhatsApp(userId, kind, template, params)` via Cloud API, med samma "aldrig blockera cron"-regel som push | `sendPushToUser` |
| Tabell `whatsapp_prefs` | userId, telefon (E.164), `optInAt`, `verifiedAt`, `kindsOn`, `optOutAt` | `push_prefs`, `email_prefs` |
| Verifiering av numret | engångskod via en **authentication**-mall, användaren skriver in koden | `User.phone` finns redan |
| Webhook `/api/whatsapp/webhook` | leveransstatus, inkommande "STOPP"/"STOP" → opt-out | – |
| Inställningar → Notiser | en tredje kolumn **WhatsApp** i Anpassa och i förvalen, bara för vuxna i Pro | `NotifyPrefsCard` |
| Familjens standard (admin) | "Föreslå WhatsApp för familjens vuxna" (varje vuxen måste ändå själv opt-in) | §28 i briefen |
| Mätning | `whatsapp_sent`, `whatsapp_failed`, `whatsapp_opt_out` | `trackServer` |
| Flagga | `FEATURE_WHATSAPP=true` + `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET` | samma mönster som `FEATURE_CUSTODY` |

**Mallar för V1 (sv och en, kategori utility):**
1. `reminder_due`: "Påminnelse: {{1}} {{2}}." (namn och när), med knapp *Öppna*.
2. `change_alert`: "{{1}}: {{2}} är flyttad till {{3}}." (barn, aktivitet, ny tid).
3. `evening_summary`: "I morgon: {{1}}." (en kort rad med prov, läxor, aktiviteter och skjuts).
4. `verify_number` (kategori authentication): engångskod.

Steg 2 i briefen ("Klart", "Påminn mig senare", "Gäller Oliver") blir **snabbknappar i mallarna**. Svaren kommer till webhooken och kopplas till samma `PATCH /api/reminders/[id] { done }` som Klart-knappen i appen. Det ingår inte i V1.

## 4. GDPR

- Meta (WhatsApp Ireland) blir **personuppgiftsbiträde** för meddelandeinnehållet: namn på barn, aktiviteter och tider. Överföring till USA sker inom EU–US Data Privacy Framework. Det kräver en ny rad i `GDPR.md`, text i `/privacy` och en kort konsekvensbedömning (DPIA), eftersom barns uppgifter berörs.
- **Dataminimering:** mallarna ska bara ta med det som behövs, alltså förnamn och titel. Inga anteckningar och inga belopp.
- Telefonnumret sparas bara för den som själv slår på WhatsApp, och raderas när man slår av det eller tar bort kontot (`lib/accountDeletion.ts`).

## 5. Ordning när det byggs (uppskattning)

1. Konton och mallar hos Meta (Mikael, ungefär 1–2 veckor med verifiering).
2. `lib/whatsapp.ts`, tabell, verifiering av nummer, webhook och flagga (ungefär 1 dag).
3. Kanalen i Notiser och i utskicken (`cron.ts`, `changeWatch.ts`, `tomorrowDigest.ts`) (ungefär 1 dag).
4. Test med Mikaels familj bakom flaggan, mätning i Nyckeltal, sedan beslut om att öppna för alla.

## 6. Beslut som behövs från Mikael

- [ ] Starta Meta Business-konto och verifiering. Det kräver i praktiken bolaget (lanseringslistan rad 9–11).
- [ ] Telefonnummer och visningsnamn för avsändaren.
- [ ] Budget och var det ska ligga: Pro, och sammanfattningen som eget val?
- [ ] Godkänn mallarna i avsnitt 3 (texten skickas till Meta för granskning).
