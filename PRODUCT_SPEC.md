# Product Spec – Reminder for Simplicity
**Version:** 2.0 | **Uppdaterad:** 2026-03-31 | **Ägare:** Mikael Berglund

---

## 1. Problemet vi löser

Människor glömmer viktiga datum och löpande kostnader. Abonnemang förnyas automatiskt utan att man tänker på det, försäkringar förnyas till sämre pris, presenter köps i sista minuten, viktiga avtal missas – och de flesta vet inte ens vad de spenderar per månad på abonnemang.

**Reminder for Simplicity** är platsen där du samlar allt – en enkel, överskådlig påminnelsetjänst utan krångel. Ingen inlärningskurva, inga onödiga funktioner.

> "Din lugna vän som aldrig glömmer."

---

## 2. Målgrupp

**Primär:** Privatpersoner 25–55 år som vill ha koll på sina kostnader och viktiga datum utan att behöva lära sig ett komplicerat verktyg.

**Sekundär:** Småföretagare som vill hålla koll på leverantörsavtal, licenser och förnyelsedatum.

**Tonalitet:** Enkel, varm, organiserad.

---

## 3. Positionering

Vi konkurrerar inte med Todoist eller TickTick. Vi är inte ett uppgiftshanteringsverktyg. Vi är specialister på **det som kostar pengar och har ett datum** – abonnemang, försäkringar, avtal, dokument. Det gör oss enkla att förstå och enkla att sälja.

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

**Prenumeration (primär):**
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

### Datamodell

**User**
`id, email, password_hash, created_at, email_verified, plan (free/premium)`

**Reminder**
`id, user_id, name, category, service_preset, date, recurrence, amount, currency, note, reminder_days_before, is_active, created_at, updated_at`

**ServicePreset** *(inbyggda tjänster med logo)*
`id, name, category, logo_url, default_recurrence`

**ReminderLog**
`id, reminder_id, sent_at, channel (email/whatsapp/sms)`

---

## 9. Design & UX-principer

1. **Max 3 klick** för att lägga till en påminnelse
2. **Inga obligatoriska fält utom namn och datum** – resten är valfritt
3. **Mobilanpassad** – fungerar perfekt på telefon i webbläsaren
4. **Svenska som primärspråk** (engelska i Fas 2)
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
