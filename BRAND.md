# Brand Guide – Reminder for Simplicity
**Version:** 1.2 | **Skapad:** 2026-03-31 | **Färgpalett uppdaterad:** 2026-07-26 | **Nav/ikon-sektion omskriven:** 2026-07-28, nuläge tillagt 2026-10-04 (anpassningsbar bottenmeny + fullständig hamburgermeny + kalenderns typfärger, se `TODO.md` 19/20)

> 🧪 **Lotuvi-test live (2026-10-10):** Färger, ikoner, logomärke, figur och mörkt läge följer nu *Lotuvi_Brand_Product_Guidelines_v0.3* (Family-uttrycket). **Namnet är oförändrat** ("Reminder for Simplicity"). Sanningskällan för färger är `app/src/app/globals.css`; §3 och §6 nedan beskriver nuläget. Se `RELEASE_2026-10-10b.md` (ljust, ikoner, figur) och `RELEASE_2026-10-10c.md` (mörkt läge "Sage First").

> 🗄️ *Historik:* **Färgpalett löst (2026-07-26):** Tidigare fanns tre olika accentfärger i `BRAND.md`, `RFS-Product-Direction.md` och `globals.css`. Mikael valde paletten från `RFS-Product-Direction.md` (accent `#4A5FD5`) som sanningskälla. Den är nu genomförd i `globals.css` och samtliga `.tsx`-filer i `app/src`. (Ersatt av Lotuvi-paletten 2026-10-10.)

---

## 1. Varumärkesidentitet

**Namn:** Reminder for Simplicity
**Tagline:** "Glöm aldrig det som spelar roll."
**Kort beskrivning:** En enkel, varm påminnelsetjänst som hjälper dig hålla koll på abonnemang, datum och det som är viktigt i livet.

---

## 2. Varumärkesröst

### Vi är:
- **Enkla** – Inga onödiga ord. Rakt på sak.
- **Varma** – Vi pratar som en hjälpsam vän, inte ett företag.
- **Pålitliga** – Vi lovar inget vi inte kan hålla. Vi levererar.
- **Lätta** – Vi tar bort stress, inte lägger till den.

### Vi är inte:
- Formella eller stela
- Överdrivet tekniska
- Skrämmande ("Du MÅSTE sätta upp reminders nu!")
- Irriterande (aldrig för många notifications)

### Tone examples (English – matches the shipped app):
| ❌ Avoid | ✅ Use |
|---|---|
| "Welcome to our platform" | "Hey! Glad you're here." |
| "The notification has been successfully dispatched" | "Done! We'll remind you 3 days before." |
| "Optimize your reminder strategy" | "Add the thing you don't want to forget." |
| "Your session has expired" | "You've been signed out – log back in whenever you're ready." |

---

## 3. Visuell identitet

### Färgpalett – ljust läge (Lotuvi Family, 2026-10-10)
Alla värden är RIKTNING enligt riktlinjerna och ändras **bara** i `globals.css` (tokens). Hårdkoda aldrig hex, `white` eller `black` i komponenter.
```
Token              Värde      Roll
--background       #FAF7F2    Sidbakgrund (cream)
--surface          #FFFFFF    Kort/ytor
--surface-3        #F4EFE8    Upphöjd/tryckt yta
--fg               #142B3A    Primär text (Lotuvi text-primary)
--muted            #5F6E79    Sekundär text (4,9:1 på cream)
--border           #ECE6DD    Diskreta kanter
--ink              #142B3A    Mörka fyllda knappar, hero-kort
--accent           #B5451F    Accent som text/länk (5,1:1 på cream)
--accent-bg        #C24F26    Fyllda primärknappar, FAB (vit text 4,7:1)
--on-accent        #FFFFFF    Text/ikon PÅ --accent-bg
--brand-peach      #FF8F61    Family-primary – bara ytor/illustration (vit text 2,25:1 = underkänt)
--accent-2         #FF8F61    Sekundär varm accent, sparsamt
--premium          #8A6516    Pro/premium-status (på --tint-premium #F8EED8)
--success          #1E7D52 · --warning #B45309 · --danger #D94F4F
```
Kalender-/typfärger (oförändrade, funktionella): syssla `#0E9F8E`, aktivitet `#D85A30`, läxa `#3730A3`, prov `#B42318`, påminnelse `#5A6B78`.

### Logomärke, ikoner och figur
- **Symbol:** tre blad (grön, peach, blå), ingen text. Tillfällig rasterfil `app/public/brand/Lotuvi_Symbol_v0.1.png`, används via `components/BrandMark.tsx`. Rita aldrig om symbolen i kod – byt filen när produktionsloggan finns (ÖPPET).
- **Appikoner/favicon:** `app/public/icons/` (192/512, maskable, apple-touch, favicon-32) + `app/public/favicon.ico` – symbolen på vit bakgrund.
- **Figuren (companion):** `app/public/brand/Lotuvi_Companion_Lotu_v0.1.webp`, i en cream-cirkel (`<Companion />`). Används på startsidan; enligt riktlinjerna även för onboarding, tomma lägen och glädjeögonblick – inte på varje skärm eller vid allvarliga fel. Samma bild i ljust och mörkt.

### Typografi
- **Rubriker:** Inter Bold (alt: Geist Sans)
- **Brödtext:** Inter Regular
- **Kod/datum:** Geist Mono

### Spacing & Form
- Rundade hörn: kort 12–16 px (`--radius-md/lg`). Knappar är fortfarande "piller"; riktlinjen säger 10–14 px – ej genomfört än.
- Generös whitespace – aldrig trångt
- Subtila skuggor (box-shadow: 0 2px 8px rgba(0,0,0,0.08))

---

## 4. Kategori-ikoner (emoji som standard i MVP)

| Kategori | Ikon | Färg |
|---|---|---|
| Abonnemang | 💳 | Primär blå |
| Födelsedag | 🎂 | Varm gul |
| Försäkring | 🛡️ | Mint |
| Avtal | 📄 | Grå |
| Hälsa | ❤️ | Röd |
| Övrigt | 📌 | Lila |

---

## 4b. Bottenmeny & övriga ikoner (tillagt 2026-07-27, omskrivet 2026-07-28)

Sedan appen breddades till att inte bara vara påminnelser (se positioneringsbeslutet i `PRODUCT_SPEC.md` §3, "vi tänker stort, inte bara reminder-app") används linjeikoner (SVG, inte emoji) i bottenmenyn (`components/BottomNav.tsx`) och hamburgermenyn (`components/HamburgerMenu.tsx`).

> **Nuläge 2026-10-04:** Home (husikon) är den låsta första fliken sedan 2026-10-03; Calendar är ett val bland de andra. Barn väljer också själva, standard Home, Calendar, School, Activities. Activities har 🎯-ikon sedan namnbytet 2026-08-02. Tabellen nedan är den ursprungliga versionen.

**Bottenmenyn är sedan 2026-07-28 anpassningsbar per person** (se `TODO.md` 19a, `PRODUCT_SPEC.md` 4b.10) istället för tre fasta flikar. Calendar är den enda obligatoriska, alltid-första fliken. Utöver den väljer varje person 2–3 till i Profile → Preferences, bland:

| App | Ikon | Kommentar |
|---|---|---|
| Calendar | 📅-formad linjeikon | Alltid först, går inte att stänga av |
| Reminders | 🔔-formad linjeikon | Samma klocka-koncept som tidigare, nu SVG istället för emoji i själva navigeringen |
| Shopping list | 🛒-formad linjeikon | |
| Wishlist | 🎁-formad linjeikon | |
| Chores | 🧹-formad linjeikon | |
| Training | ⚽-formad linjeikon | |
| School | 📚-formad linjeikon | |

Default om inget valts: Reminders, Shopping list, School (+ Calendar = 4 totalt).

I marknadsföringstexter (startsida, feature-pills, `/features`) används däremot fortfarande emoji (🔔 📅 🛒 📚 🧒 🎯 🧹 🎁) för samma appar – konsekvent parvis med SVG-versionen i appen. *(Startsidan och `/features` omgjorda 2026-10-04: Log in uppe till höger, Free/Pro från `lib/plans.ts`.)*

**Hamburgermenyn innehåller sedan 2026-07-28 alla sidor, inte bara Family/Settings/Admin/Sign out** – den är tänkt som den fullständiga åtkomstpunkten oavsett vad som är valt i bottenmenyn: Reminders, Calendar, Shopping list, Wishlist, Chores, Training, School, Ideas & voting, Settings, (Admin, villkorat), Sign out. Samma linjeikon-stil som bottenmenyn, inte emoji.

**Kalenderns typfärger** (filterchips och prickar i månadsvyn, se `PRODUCT_SPEC.md` 4b.25) är den enda platsen i appen som använder en egen liten färgpalett per innehållstyp snarare än accentfärgen – se paletten i §3 ovan (Chores teal, Training koral, School indigo, Reminders neutral blågrå). Vald medvetet för att vara urskiljbara som prickar i en liten kalenderruta utan att konkurrera med accentfärgen (`--accent`).

---

## 5. Email templates (tone) *(translated to English 2026-07-27, per the language decision)*

### Reminder email
```
Subject: 🔔 Reminder: [NAME] in [X] days

Hi [FIRST NAME],

You wanted to be reminded about [NAME].

📅 Date: [DATE]
[💰 Cost: X kr]  ← Only show if an amount is set
[📝 Note: ...]  ← Only show if a note is set

Hope this helps!
Reminder for Simplicity

---
Don't want more reminders? [Unsubscribe]
```

### Welcome email
```
Subject: Welcome to Reminder for Simplicity 👋

Hi [FIRST NAME],

Glad you're here. Now you can start collecting everything you don't want to forget in one place.

What can you add?
• Subscriptions that renew
• Insurance and contracts
• Birthdays and anniversaries
• Anything else that matters

[Go to your dashboard →]

Reach out if you have questions.
Mikael at Reminder for Simplicity
```

---

## 6. Sociala medier

**LinkedIn:** Professionell men personlig. Dela lärdomar från att bygga produkten.
**Instagram:** Visuellt enkelt. Tipsar om hur man håller koll på livet.
**X/Twitter:** Snabba tips, produktuppdateringar, dialog med early adopters.

### Hashtags (svenska)
#produktivitet #digitallthälsa #abonnemang #påminnelser #startupsweden

---

*Uppdatera brand guide när varumärket utvecklas. Alla i projektet (inklusive Claude) ska följa denna guide.*

---

## 6. Mörkt läge – Lotuvi Family Dark "Sage First" (2026-10-10, riktlinjer v0.3 §09)

Tre val per enhet: **System** (standard, följer `prefers-color-scheme`) / Ljust / Mörkt – ett aktivt val sparas och vinner över systemet (`lib/theme.ts`). Mörkt läge är samma produkt och informationshierarki, bara andra tokenvärden.

```
Token              Värde                    Roll
--background       #0F1412                  surface-page (grön-charcoal, inte svart)
--surface          #1A2020                  surface-card
--surface-3        #263030                  upphöjd/tryckt yta
--fg               #F3F5F4                  text-primary
--muted            #A7B0AC                  text-secondary (7,4:1 på kort)
--border           #2A3230                  border-subtle
--accent/-bg       #6EE7B7                  family-dark-primary: vald nav, FAB, primärknappar, länkar
--on-accent        #0F1412                  mörk text på mint (12:1)
--accent-2         #FF7D66                  coral – sekundär, sparsamt
--premium          #E8C987                  Pro-chip (champagne), ej mint
--success #6EE7B7 · --warning #F5B056 · --danger #FF7B7B
theme-color        #0F1412
```
Regel: text på en fylld accentyta använder alltid `var(--on-accent)` – vit i ljust, mörk i mörkt. Släpp aldrig in `#fff` på `--accent-bg`.

## 7. Bilder, avatarer och färgkoder (tillagt 2026-09-29)

- **Avatarer:** personens foto om det finns (rund, `object-fit: cover`), annars förbokstav i vitt på en färg som är stabil per person: `#C24F26`, `#C4367A`, `#1E7D52`, `#D85A30`, `#6A44CC`, `#0E9F8E`, `#B45309`, `#3730A3` (`components/Avatar.tsx`).
- **Familjefoto:** överst på Home, 150 px högt, rundade hörn (22 px), beskärs med `cover`.
- **Tjänstelogotyper** (Netflix, Spotify …) visas som initialer i tjänstens egen färg – vi hämtar inga logotyper från externa tjänster (GDPR, se `GDPR.md`).
- **Kalenderns typfärger:** påminnelse `#5A6080` (kategorifärg per post), syssla `#0E9F8E`, aktivitet `#D85A30`, läxa `#3730A3` 📝, prov `#B4235A` 🧪.
