# Brand Guide – Reminder for Simplicity
**Version:** 1.1 | **Skapad:** 2026-03-31 | **Färgpalett uppdaterad:** 2026-07-26

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

## 4b. Bottenmeny & övriga ikoner (tillagt 2026-07-27)

Sedan appen breddades till att inte bara vara påminnelser (se positioneringsbeslutet i `PRODUCT_SPEC.md` §3, "vi tänker stort, inte bara reminder-app") används tre linjeikoner (SVG, inte emoji) i den nya bottenmenyn (`components/BottomNav.tsx`):

| Flik | Ikon | Kommentar |
|---|---|---|
| Reminders | 🔔-formad linjeikon | Samma klocka-koncept som tidigare, nu SVG istället för emoji i själva navigeringen |
| Shopping list | 🛒-formad linjeikon | |
| Wishlist | 🎁-formad linjeikon | |

I marknadsföringstexter (startsida, feature-pills) används däremot fortfarande emoji (🔔 🛒 🎁) för samma tre saker – konsekvent parvis med SVG-versionen i appen. Hamburgermenyn (`components/HamburgerMenu.tsx`, för Family/Settings/Admin/Sign out) använder samma linjeikon-stil som bottenmenyn, inte emoji.

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
