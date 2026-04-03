# Claude Company Framework
**Version:** 1.0 | **Skapad:** 2026-03-31
**Syfte:** Återanvändbar mall för att driva ett digitalt företag med Claude som operativ motor.

---

## 1. Vad är ett Claude-drivet företag?

Claude fungerar som din **tekniska medgrundare, marknadsförare och produktchef** i ett och samma verktyg. Du sätter visionen och fattar slutgiltiga beslut – Claude exekverar, analyserar och föreslår.

### Ansvarsfördelning

| Roll | Du | Claude |
|---|---|---|
| Vision & strategi | ✅ Beslutar | 🔍 Analyserar & föreslår |
| Produktutveckling | ✅ Godkänner | ✅ Bygger & underhåller |
| Marknadsföring | ✅ Godkänner ton & budskap | ✅ Skapar content |
| Operativa beslut | ✅ Fattar beslut | ✅ Underlag & rekommendationer |
| Kundkommunikation | ✅ Hanterar eskalationer | ✅ Svarar på standardärenden |

---

## 2. Projektstruktur (återanvänd detta i varje nytt projekt)

```
/projekt-namn/
├── CLAUDE_COMPANY_FRAMEWORK.md   ← Denna fil (kopiera till varje nytt projekt)
├── PRODUCT_SPEC.md               ← Vad appen gör, för vem, och hur
├── ROADMAP.md                    ← Prioriterad feature-lista
├── OPERATIONS.md                 ← Hur Claude sköter löpande drift
├── BRAND.md                      ← Tonalitet, färger, varumärke
├── app/                          ← Applikationens källkod
│   ├── src/
│   ├── package.json
│   └── ...
└── marketing/                    ← Landningssida, emails, content
```

---

## 3. Hur du startar ett nytt projekt med Claude (checklista)

### Steg 1 – Definiera produkten (15 min)
Besvara dessa frågor för Claude:
- [ ] Vad löser produkten för problem?
- [ ] Vem är målgruppen? (ålder, teknikvana, land)
- [ ] Hur tjänar produkten pengar? (freemium, SaaS, engångsköp)
- [ ] Vad är MVP? (minsta möjliga version att lansera)

### Steg 2 – Sätt ramverket (30 min)
- [ ] Be Claude skapa `PRODUCT_SPEC.md`
- [ ] Be Claude skapa `ROADMAP.md` med 3 faser: MVP → Tillväxt → Skala
- [ ] Definiera tech-stack (se avsnitt 4)
- [ ] Be Claude skapa `BRAND.md` med varumärkesröst och visuell identitet

### Steg 3 – Bygg MVP (löpande)
- [ ] Be Claude scaffolda projektet
- [ ] Jobba i sprints om 1-2 veckor
- [ ] Varje sprint: Be Claude lista vad som ska göras → godkänn → Claude bygger

### Steg 4 – Lansering
- [ ] Be Claude skriva landningssida
- [ ] Be Claude skriva 5 launch-posts (LinkedIn, X, Instagram)
- [ ] Be Claude skriva välkomstmail till första användare
- [ ] Be Claude sätta upp automatiska email-reminders

---

## 4. Rekommenderad tech-stack (testad kombination)

| Komponent | Verktyg | Varför |
|---|---|---|
| Frontend + Backend | **Next.js 14** | Allt i ett, enkel deployment |
| Styling | **Tailwind CSS + shadcn/ui** | Snabbt, proffsigt resultat |
| Databas | **Supabase (PostgreSQL)** | Gratis tier, inbyggd auth |
| Auth | **NextAuth.js** | Flexibel, säker |
| Email | **Resend** | Modern API, gratis upp till 3000/månad |
| Hosting | **Vercel** | Gratis tier, automatisk deploy från GitHub |
| Domän | **Namecheap / Cloudflare** | Billigast |
| Betalningar (framtida) | **Stripe** | Branschstandard |

**Totalkostnad MVP: 0 kr/månad** (inom gratis-tiers)

---

## 5. Prompt-mallar för Claude (kopiera och använd)

### 🏗️ Ny feature
```
Jag vill lägga till [FEATURE] i [APP-NAMN].
Målgrupp: [VEM ANVÄNDER DET]
Affärsmål: [VAD VINNER VI PÅ DET]
Nuvarande tech-stack: Next.js, Supabase, Tailwind
Börja med att lista vad som behöver byggas, sedan koda det.
```

### 📣 Marknadsföringspost
```
Skriv en [LinkedIn/X/Instagram]-post om [ÄMNE] för [APP-NAMN].
Tonalitet: [se BRAND.md]
Målgrupp: [VEM]
Kärnbudskap: [VAD VILL VI ATT DE SKA FÖRSTÅ/GÖRA]
Max längd: [X tecken]
```

### 📊 Besluts-underlag
```
Jag överväger [BESLUT A] vs [BESLUT B] för [APP-NAMN].
Kontext: [RELEVANT BAKGRUND]
Ge mig: pros/cons, din rekommendation, och 3 saker jag bör tänka på.
```

### 🐛 Felsökning
```
Jag får detta fel i [APP-NAMN]:
[FELMEDDELANDE]
Relevant kod: [KOD]
Vad är felet och hur fixar vi det?
```

### 📧 Kundkommunikation
```
En användare har skrivit: "[MEDDELANDE]"
Skriv ett svar som är [tonalitet från BRAND.md].
Lös problemet om möjligt, eller eskalera till mig om det kräver manuell åtgärd.
```

---

## 6. Sprint-ritual (gör detta varje vecka)

**Måndag – Planering (10 min med Claude)**
> "Det är sprint-start. Här är vad som hände förra veckan: [SAMMANFATTNING].
> Föreslå de 3-5 viktigaste sakerna att bygga/fixa den här veckan baserat på vår roadmap."

**Fredag – Review (5 min med Claude)**
> "Sprint-slut. Vi hiclade [LISTA]. Vad bör vi lyfta till nästa sprint?
> Skriv ett kort status-mail som jag kan skicka till eventuella investerare/partners."

---

## 7. KPIer att följa (anpassa per produkt)

| Metrik | Mål (månad 1) | Mål (månad 3) | Mål (månad 6) |
|---|---|---|---|
| Registrerade användare | 50 | 250 | 1000 |
| Aktiva användare (vecka) | 20 | 100 | 400 |
| Email open rate | 40% | 45% | 50% |
| Churn (månatlig) | <10% | <7% | <5% |
| Intäkter (om betald) | 0 kr | 500 kr | 3000 kr |

---

## 8. Eskalationsregler (när du måste ta beslut själv)

Claude hanterar allt rutinmässigt, men DU fattar beslut när:
- Kostnad > 500 kr/månad
- Juridiska frågor (GDPR, avtal, villkor)
- Negativ press eller kundklagomål om integritet
- Pivotbeslut (byta affärsmodell, target audience)
- Integrera betalsystem eller hantera betaldata

---

*Ramverket underhålls av dig och Claude gemensamt. Uppdatera det efter varje projekt med vad som fungerade.*
