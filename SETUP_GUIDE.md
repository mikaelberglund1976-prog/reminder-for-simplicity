# Steg-för-steg: Från noll till live app
**För dig utan teknisk bakgrund – inga förkunskaper krävs**

Räkna med ca **2-3 timmar** totalt, men du kan ta en paus när du vill.

---

## Vad vi ska göra (översikt)

```
Din dator          Internet-tjänster
──────────         ─────────────────
VS Code       →    GitHub (kod-lagring)
(kodredigerare)         ↓
                   Vercel (din app live på webben)
                         ↓
                   Supabase (databas = alla användare & reminders)
                         ↓
                   Resend (skickar emails)
```

Alla tjänster är **gratis** i det här skedet.

---

## Steg 1 – Installera verktyg på din dator
**Tid: ~20 minuter**

### 1a. Installera Node.js
Node.js är motorn som kör din app lokalt (på din dator).

1. Gå till: **https://nodejs.org**
2. Klicka på den stora gröna knappen **"LTS"** (den rekommenderade versionen)
3. Ladda ned och installera (klicka bara "Next" hela vägen)
4. **Verifiera:** Öppna Terminal (Mac) eller Kommandotolk (Windows) och skriv:
   ```
   node --version
   ```
   Du ska se något i stil med `v20.x.x` – då fungerar det!

### 1b. Installera VS Code (kodredigerare)
VS Code är programmet du använder för att se och redigera koden.

1. Gå till: **https://code.visualstudio.com**
2. Ladda ned och installera

### 1c. Installera Git
Git är verktyget för att skicka kod till GitHub.

1. Gå till: **https://git-scm.com/downloads**
2. Ladda ned och installera för ditt operativsystem

---

## Steg 2 – Skapa konton
**Tid: ~20 minuter**

Skapa konton på dessa fyra tjänster. Spara dina inloggningsuppgifter!

| Tjänst | Länk | Vad det är |
|---|---|---|
| **GitHub** | https://github.com | Lagrar din kod |
| **Supabase** | https://supabase.com | Databasen (användare & data) |
| **Resend** | https://resend.com | Skickar emails |
| **Vercel** | https://vercel.com | Hostar din app live |

> 💡 **Tips:** Registrera dig på Vercel med ditt GitHub-konto (klicka "Continue with GitHub") – det sparar ett steg senare.

---

## Steg 3 – Lägg upp koden på GitHub
**Tid: ~15 minuter**

### 3a. Öppna projektet i VS Code
1. Öppna VS Code
2. Klicka **File → Open Folder**
3. Navigera till mappen "Reminder for simplicity" → välj mappen **app**
4. Klicka "Open"

### 3b. Öppna terminalen i VS Code
1. I VS Code, klicka på **Terminal** i menyn → **New Terminal**
2. En svart ruta öppnas längst ned – det är din terminal

### 3c. Skapa ett GitHub-repo
1. Gå till **https://github.com/new**
2. Ge det ett namn: `reminder-for-simplicity`
3. Välj **Private** (privat = bara du ser koden)
4. Klicka **"Create repository"**
5. GitHub visar nu instruktioner – kopiera URL:en som ser ut som:
   `https://github.com/DITT-NAMN/reminder-for-simplicity.git`

### 3d. Skicka koden till GitHub
Klistra in dessa kommandon i terminalen, ett i taget (tryck Enter efter varje):

```bash
git init
git add .
git commit -m "Första commit – Reminder for Simplicity"
git branch -M main
git remote add origin https://github.com/DITT-NAMN/reminder-for-simplicity.git
git push -u origin main
```

> ⚠️ Byt ut `DITT-NAMN` mot ditt GitHub-användarnamn i kommandot ovan!

✅ **Klart!** Koden finns nu på GitHub.

---

## Steg 4 – Sätt upp databasen (Supabase)
**Tid: ~15 minuter**

### 4a. Skapa ett projekt
1. Logga in på **https://supabase.com**
2. Klicka **"New project"**
3. Fyll i:
   - **Name:** `reminder-app`
   - **Database Password:** Välj ett starkt lösenord och **spara det!**
   - **Region:** Välj `eu-central-1` (Frankfurt – nära Sverige)
4. Klicka **"Create new project"** – vänta ca 2 minuter

### 4b. Hämta din databas-URL
1. I Supabase, klicka på ⚙️ **Settings** (vänster meny) → **Database**
2. Scrolla ned till **"Connection string"**
3. Välj fliken **URI**
4. Kopiera den långa URL:en – den börjar med `postgresql://postgres:`
5. Byt ut `[YOUR-PASSWORD]` mot lösenordet du skapade

**Spara URL:en – du behöver den i Steg 6!**

---

## Steg 5 – Sätt upp email (Resend)
**Tid: ~10 minuter**

### 5a. Skapa API-nyckel
1. Logga in på **https://resend.com**
2. Gå till **API Keys** i vänster meny
3. Klicka **"Create API Key"**
4. Ge den ett namn: `reminder-app`
5. Kopiera nyckeln (börjar med `re_`) och spara den!

### 5b. Verifiera en email-adress (avsändare)
I MVP-läget kan du skicka från en Resend-testadress:
- `onboarding@resend.dev` fungerar direkt utan setup
- Om du vill ha din egen domän senare kan du lägga till det sedan

---

## Steg 6 – Konfigurera miljövariabler
**Tid: ~10 minuter**

Miljövariabler är som "hemligheter" som appen behöver för att fungera.

### 6a. Skapa .env.local
1. I VS Code, öppna terminalen
2. Kör kommandot:
   ```bash
   cp .env.example .env.local
   ```
3. Öppna filen `.env.local` i VS Code (klicka på den i filträdet till vänster)
4. Fyll i värdena:

```
DATABASE_URL="postgresql://postgres:[DITT-LÖSENORD]@db.[DITT-PROJEKT].supabase.co:5432/postgres"

NEXTAUTH_SECRET="en-lång-slumpmässig-text-här"
NEXTAUTH_URL="http://localhost:3000"

RESEND_API_KEY="re_xxxxxxxxxxxxxxxx"
RESEND_FROM_EMAIL="onboarding@resend.dev"

NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="Reminder for Simplicity"
```

> 💡 **Generera NEXTAUTH_SECRET:** Gå till https://generate-secret.vercel.app/32 och kopiera resultatet.

### 6b. Installera beroenden och sätt upp databasen
Kör dessa kommandon i terminalen:

```bash
npm install
```
*(Vänta – detta tar 1-2 minuter)*

```bash
npx prisma db push
```
*(Skapar alla databastabeller i Supabase)*

---

## Steg 7 – Testa lokalt
**Tid: ~5 minuter**

Starta appen på din dator:

```bash
npm run dev
```

Öppna webbläsaren och gå till: **http://localhost:3000**

Du bör se din landningssida! Testa att:
- [ ] Skapa ett konto
- [ ] Logga in
- [ ] Skapa en reminder

✅ Fungerar allt? Då är du redo att gå live!

---

## Steg 8 – Deploya live (Vercel)
**Tid: ~15 minuter**

Nu lägger vi upp appen så att vem som helst kan nå den via internet.

### 8a. Importera projektet i Vercel
1. Logga in på **https://vercel.com**
2. Klicka **"Add New → Project"**
3. Välj **"Import Git Repository"**
4. Du ser nu ditt GitHub-repo `reminder-for-simplicity` – klicka **Import**
5. Vercel känner automatiskt igen att det är Next.js

### 8b. Lägg till miljövariabler i Vercel
Innan du klickar "Deploy" – scrolla ned till **"Environment Variables"**:

Lägg till dessa (kopiera från din `.env.local`):

| Nyckel | Värde |
|---|---|
| `DATABASE_URL` | Din Supabase-URL |
| `NEXTAUTH_SECRET` | Din hemliga nyckel |
| `NEXTAUTH_URL` | Din Vercel-URL (se nedan) |
| `RESEND_API_KEY` | Din Resend-nyckel |
| `RESEND_FROM_EMAIL` | `onboarding@resend.dev` |
| `NEXT_PUBLIC_APP_URL` | Din Vercel-URL (se nedan) |
| `NEXT_PUBLIC_APP_NAME` | `Reminder for Simplicity` |
| `CRON_SECRET` | En slumpmässig text, t.ex. `mitt-hemliga-cron-2026` |

> 💡 **NEXTAUTH_URL och APP_URL:** Vercel ger dig en URL som `https://reminder-for-simplicity.vercel.app` – lägg in den. Du kan uppdatera detta efter deploy också.

### 8c. Deploya!
Klicka **"Deploy"** och vänta ~2 minuter.

🎉 **Din app är live!**

---

## Steg 9 – Lägg till din domän (valfritt)
**Tid: ~20 minuter + DNS-propagering 1-48h**

Om du vill ha `www.reminderapp.se` istället för `reminder-for-simplicity.vercel.app`:

1. Köp en domän på t.ex. **https://namecheap.com** (ca 100-150 kr/år)
2. I Vercel → ditt projekt → **Settings → Domains**
3. Lägg till din domän och följ Vercels instruktioner för DNS-inställningar
4. Uppdatera `NEXTAUTH_URL` och `NEXT_PUBLIC_APP_URL` till din nya domän

---

## Sammanfattning – vad har du nu?

```
✅ Landningssida (landing-page.html → flytta till app/src/app/page.tsx)
✅ Registrering & inloggning
✅ Dashboard med reminder-lista
✅ Skapa/redigera/ta bort reminders
✅ Email-påminnelser (skickas kl 08 varje morgon)
✅ Mobilanpassad design
✅ Live på internet via Vercel
✅ Databas i Supabase
```

---

## Vanliga problem & lösningar

**"command not found: npm"**
→ Node.js är inte installerat korrekt. Starta om datorn och försök igen.

**"Invalid database URL"**
→ Kontrollera att du kopierat hela URL:en från Supabase, inklusive lösenordet.

**"Build failed" på Vercel**
→ Kontrollera att alla miljövariabler är ifyllda. Det vanligaste felet.

**Emails skickas inte**
→ Kontrollera din Resend API-nyckel och att du använt `onboarding@resend.dev` som avsändare.

---

## Nästa steg när allt funkar

1. **Dela med 5 vänner** och be om feedback
2. Be Claude skriva en LinkedIn-post om lanseringen
3. Kör sprint 2 enligt roadmapen

**Fråga Claude om hjälp** när du kör fast – beskriv vad du försöker göra och vilket felmeddelande du ser.
