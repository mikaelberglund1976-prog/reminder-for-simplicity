# Brand Guide – Reminder for Simplicity
**Version:** 1.2 | **Skapad:** 2026-03-31 | **Färgpalett uppdaterad:** 2026-07-26 | **Nav/ikon-sektion omskriven:** 2026-07-28 (anpassningsbar bottenmeny + fullständig hamburgermeny + kalenderns typfärger, se `TODO.md` 19/20)

> ✅ **Färgpalett löst (2026-07-26):** Tidigare fanns tre olika accentfärger i `BRAND.md`, `RFS-Product-Direction.md` och `globals.css`. Mikael valde paletten från `RFS-Product-Direction.md` (accent `#4A5FD5`) som sanningskälla. Den är nu genomförd i `globals.css` och samtliga `.tsx`-filer i `app/src`. Paletten nedan är uppdaterad i enlighet med detta.

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

### Färgpalett
```
Bakgrund:      #F5F4F0  (varm off-white – lugn, premium)
Yta/kort:      #FFFFFF
Text:          #1C1C28  (nästintill svart – läsbarhet)
Dämpad text:   #7C7C8A  (subtext, labels)
Accent:        #4A5FD5  (lugnt indigo – primära knappar, länkar)
Accent hover:  #3A4FC5
Kant/border:   #E4E3DE
Framgång:      #2A9D6F
Varning:       #E5873A
Fel:           #D94F4F

Kalender-/typfärger (tillagda 2026-07-28, se BRAND.md 4b nedan):
Chores:        #0E9F8E  (teal)
Training:      #D85A30  (koral)
School:        #3730A3  (indigo)
Reminders:     #5A6080  (neutral blågrå, för att inte konkurrera med accentfärgen)
```

### Typografi
- **Rubriker:** Inter Bold (alt: Geist Sans)
- **Brödtext:** Inter Regular
- **Kod/datum:** Geist Mono

### Spacing & Form
- Rundade hörn (border-radius: 12px för kort, 8px för knappar)
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

I marknadsföringstexter (startsida, feature-pills) används däremot fortfarande emoji (🔔 🛒 🎁 osv) för samma appar – konsekvent parvis med SVG-versionen i appen.

**Hamburgermenyn innehåller sedan 2026-07-28 alla sidor, inte bara Family/Settings/Admin/Sign out** – den är tänkt som den fullständiga åtkomstpunkten oavsett vad som är valt i bottenmenyn: Reminders, Calendar, Shopping list, Wishlist, Chores, Training, School, Ideas & voting, Settings, (Admin, villkorat), Sign out. Samma linjeikon-stil som bottenmenyn, inte emoji.

**Kalenderns typfärger** (filterchips och prickar i månadsvyn, se `PRODUCT_SPEC.md` 4b.25) är den enda platsen i appen som använder en egen liten färgpalett per innehållstyp snarare än accentfärgen – se paletten i §3 ovan (Chores teal, Training koral, School indigo, Reminders neutral blågrå). Vald medvetet för att vara urskiljbara som prickar i en liten kalenderruta utan att konkurrera med huvudaccentfärgen `#4A5FD5`.

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
