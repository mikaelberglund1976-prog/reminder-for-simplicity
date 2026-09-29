# GDPR – Reminder for Simplicity

**Skapad:** 2026-09-29 · **Underlag:** GDPR-genomgången i projektet ("GDPR-genomgång: Reminder for Simplicity", Claude Docs) och koden live efter commit `59d4e40` + GDPR-releasen samma dag (`RELEASE_2026-09-29.md`).
**Status:** grunden är på plats och integritetsmeddelandet är publicerat på `/privacy` (version 2026-09-29). Det som återstår kräver beslut eller inloggning hos bolag/leverantörer – se §5.

Det här dokumentet innehåller de två interna dokument GDPR kräver: **registerförteckning** (art. 30) och **incidentrutin** (art. 33–34). Det publika integritetsmeddelandet finns i appen (`app/src/app/privacy/page.tsx`). Ingen juridisk rådgivning – låt gärna en jurist läsa innan bred lansering.

---

## 1. Personuppgiftsansvarig

- **Idag:** Mikael Berglund, Sverige (privatperson). Kontakt: adressen i `ADMIN_EMAIL` (visas på `/privacy`).
- **När bolaget finns** (lanseringslistan rad 9–11): byt namn, org.nr och adress i §1 på `/privacy`, höj `CONSENT_VERSION` i `app/src/lib/consent-version.ts` och uppdatera detta dokument.

---

## 2. Registerförteckning (art. 30)

Gemensamt för alla rader: lagras i Supabase (eu-central-1, Frankfurt); appens serverfunktioner körs i Vercel `fra1` (Frankfurt) sedan 2026-09-29; e-post skickas via Resend (USA). Säkerhet: se §4.

| # | Behandling | Ändamål | Registrerade | Uppgifter | Rättslig grund | Mottagare/biträden | Lagringstid |
|---|---|---|---|---|---|---|---|
| 1 | Konton och inloggning | Ge åtkomst till tjänsten | Alla användare | Namn, e-post, telefon (valfri), tidszon, valuta, bcrypt-hash av lösenord eller Google-id | Avtal (6.1 b) | Supabase, Vercel, Google (valfritt) | Tills kontot raderas + 60 dagar |
| 2 | Familj och roller | Dela innehåll med rätt personer | Alla användare | Familj, roll, inbjudningar (e-post) | Avtal | Supabase, Vercel, Resend (inbjudan) | Som #1; inbjudan 48 h / 7 dagar |
| 3 | Påminnelser | Visa och mejla påminnelser | Vuxna | Namn, datum, belopp, kategori (kan röra hälsa), anteckning | Avtal | Supabase, Vercel, Resend | Som #1 |
| 4 | Familjens vardag | Sysslor, aktiviteter, läxor & prov, kalender, ICS-flöde | Barn och vuxna | Titel, datum, ämne, avbockning, vem det gäller | Avtal med föräldern | Supabase, Vercel, Resend (dagen-före-mejl) | Som #1 |
| 5 | Listor | Inköps- och önskelistor | Alla | Varor, önskningar, reservationer | Avtal | Supabase, Vercel, Open Food Facts (vid skanning, från webbläsaren) | Som #1 |
| 6 | Bilder | Profilbild och familjefoto | Alla, även barn | JPEG-bild (komprimerad) | Samtycke (6.1 a); för barn vårdnadshavarens | Supabase, Vercel | Tills de tas bort; rensas automatiskt när personen/familjen raderats |
| 7 | Vårdnadshavarens bekräftelse | Visa att en förälder godkänt barnets konto | Barn, förälder | Barn-id, förälder-id, familj, version, tid | Rättslig förpliktelse/ansvarsskyldighet (6.1 c/f) | Supabase | Så länge barnkontot finns |
| 8 | Säkerhet | Verifierad e-post, admingodkännande, radering, spärr vid felaktiga inloggningar | Alla | Tidpunkter, status, vem som godkände | Berättigat intresse (6.1 f) | Supabase, Vercel | Som #1; inloggningsspärr i minnet 15 min |
| 9 | Idétavlan | Förslag och röster | Inloggade | Titel, text, namn, röster | Berättigat intresse | Supabase, Vercel | Som #1 |
| 10 | Egen reklam | Visa och rapportera annonser | Gratis-vuxna (inga personuppgifter sparas) | Bara totalsiffror visningar/klick | Berättigat intresse | Supabase | Så länge annonsen finns |
| 11 | Administration | Support, beviljning av Pro, återställning | Alla | Allt ovan, läsbart för admin i `/admin` | Berättigat intresse / avtal | – | – |

**Inte behandlat:** personnummer, adress, ålder, betalkortsuppgifter (kommer via Stripe senare → ny rad), spårning/analys, tredjepartsreklam.

---

## 3. Barn

- Barn läggs alltid till av en vuxen i familjen (☰ → Family members → "A child"). Den vuxne måste kryssa i att hen är vårdnadshavare och godkänner integritetsmeddelandet för barnet. Bekräftelsen sparas i tabellen `parental_consents` (vem, när, version).
- Barn som fanns före 2026-09-29 har ingen sparad bekräftelse – en förälder ser "Confirm as guardian" på Family members.
- Egen registrering: registreringssidan säger att man måste vara 13 år för att skapa ett konto själv. Det är nytt 2026-09-29 och kan tas bort om Mikael vill. **Beslutet från 2026-08-02 om ingen åldersgräns för barnprofiler (som föräldern skapar) gäller fortfarande.**
- Barn ser bara sina egna saker och aldrig reklam. "My week" har en kort barnversion av integritetstexten ("What does the app save about me?").

---

## 4. Säkerhet (tekniska och organisatoriska åtgärder)

- HTTPS överallt; bcrypt (cost 12) för lösenord; mejllänkar lagras som SHA-256.
- Behörighet kontrolleras i varje API-route (familj, roll, barn ser bara sitt).
- Inloggningsspärr efter 5 felförsök (in-memory per instans).
- JWT-session kontrolleras mot radering var 5:e minut.
- Googles access-/id-tokens sparas inte (sedan 2026-09-29); gamla nollställs av daglig cron.
- Bilder visas bara för familjen och skickas med `Cache-Control: private`.
- Hemligheter i Vercels miljövariabler.
- **Att göra (Mikael):** tvåstegsverifiering på Google-kontot som är admin, samt på Vercel, Supabase och GitHub.

---

## 5. Kvar att göra

**Kräver Mikael (beslut eller inloggning):**
- [ ] Bolag som personuppgiftsansvarig (lanseringslistan rad 9–11) → uppdatera `/privacy` §1.
- [ ] Godkänn biträdesavtal (DPA) i Supabase, Vercel och Resend; spara PDF:erna i projektmappen (rad 17).
- [ ] Kontrollera i Supabase hur länge backuper sparas; skriv det här och i `/privacy` §5.
- [ ] Kontrollera att `RESEND_FROM_EMAIL` är en adress på assistiq.se.
- [ ] Tvåstegsverifiering (se §4).
- [ ] Juristläsning av `/privacy` före bred lansering.

**Kod (klart 2026-09-29):** se `RELEASE_2026-09-29.md`.

---

## 6. Incidentrutin (art. 33–34)

En personuppgiftsincident = data har läckt, ändrats eller förstörts av misstag eller obehörigt (t.ex. fel familj ser annans data, databasnyckel läcker, en bugg visar barns uppgifter för fel person).

1. **Stoppa** (samma timme): rotera läckta nycklar i Vercel/Supabase/Resend; rulla tillbaka deployen (Vercel → Deployments → Promote en tidigare); stäng av funktionen om det behövs.
2. **Dokumentera** direkt i `INCIDENTS.md` (skapa filen vid första incident): vad, när upptäckt, vilka och hur många som berörs, vilka uppgifter, vad som gjorts.
3. **Bedöm risk:** innebär det en risk för de drabbade (t.ex. barns uppgifter, bilder, hälsa, inloggning)? Om ja → steg 4. Om det är osannolikt att det medför risk → dokumentera varför och stanna där.
4. **Anmäl till IMY inom 72 timmar** från att det upptäcktes: imy.se → "Anmäl personuppgiftsincident". Komplettera senare om allt inte är känt.
5. **Informera de drabbade** utan onödigt dröjsmål om risken är hög: mejl med vad som hänt, vad det betyder och vad de ska göra (t.ex. byta lösenord).
6. **Följ upp:** åtgärda orsaken, lägg till test, uppdatera detta dokument.

Claude kan hjälpa med steg 1–2 och 6 (kod, loggar i Vercel, tillbakarullning) men anmälan till IMY görs av den personuppgiftsansvarige.
