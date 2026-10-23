# GDPR – Reminder for Simplicity

**Skapad:** 2026-09-29 · **Underlag:** GDPR-genomgången i projektet ("GDPR-genomgång: Reminder for Simplicity", Claude Docs) och koden live efter commit `59d4e40` + GDPR-releasen samma dag (`RELEASE_2026-09-29.md`).
**Ändring 2026-10-04:** ingen ny behandling av personuppgifter. Behörigheten skärptes inte utan förtydligades: barn ser i kalendern samma saker de redan såg (egna + delade med dem); vuxna i familjen kan nu öppna, ändra och ta bort poster som delas i familjen även om någon annan skapat dem (`lib/reminderAccess.ts`). Privata poster syns fortfarande bara för den som skapade dem.
**Ändring 2026-10-04 (kväll):** ingen ny behandling av personuppgifter. Familjens valda språk sparas i `households.language` (inställning, inte en personuppgift i sig) och en nödvändig funktionskaka `rfs_lang` minns språket på enheten (ingen spårning, inget samtycke krävs). Integritetsmeddelandet finns nu även på svenska (`app/src/app/privacy/PrivacySv.tsx`) med samma innehåll; kaksektionen nämner språkkakan. `CONSENT_VERSION` oförändrad (2026-09-29) eftersom inget ändrats i sak. Mejl skickas på familjens språk.
**Ändring 2026-10-23 (samlad för 9–23 okt):** nya behandlingar införda i registret nedan – klubbkalendrar (4d), schemat och skolstart (4e), Resor med passets utgångsdatum (4f), notiser och mejlval (13), "Skriv vad som helst" (under 12) och släktdelning av önskelistan (under 5). Växelvis boende (4g) är förberett men avstängt. Integritetstexten på `/privacy` nämner inte alla dessa än – se §5.
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
| 4b | Skolkalender-import: SchoolSoft (sedan 2026-10-03), Studybee (sedan 2026-10-10) | Hämta barnets läxor, prov och skolhändelser | Barn | Prenumerationslänkar (hemliga, max 3 per barn), titel, datum, beskrivning från plattformen | Avtal med föräldern | Supabase, Vercel; hämtas från SchoolSoft resp. Studybee (skolans system) | Tills en vuxen kopplar bort; länken raderas med barnkontot |
| 4c | Födelsedagar (sedan 2026-10-10) | Visa i kalendern och påminna familjen; släktingar som barnets önskelista delats med påminns om barnets födelsedag | Familjemedlemmar, släkt, vänner (också barn) | Namn, dag och månad, årtal bara om man vill, typ (släkt/kompis/husdjur), vem den gäller | Avtal; för personer utanför familjen berättigat intresse (en vanlig adressboksuppgift) | Supabase, Vercel, Resend | Tills den tas bort; följer familjen |
| 4d | Klubbkalendrar för aktiviteter (sedan 2026-10-09) | Visa barnets träningar och matcher | Barn | Prenumerationslänkar (hemliga, max 3 per barn), titel, tid, plats från klubbens kalender; MyClub-svar [Ja]/[Nej] | Avtal med föräldern | Supabase, Vercel; hämtas från klubbens kalendertjänst (t.ex. Laget.se, SportAdmin, IdrottOnline, Spond/Google, MyClub) | Tills en vuxen kopplar bort; följer barnkontot |
| 4e | Skolschema och skolstart (schema sedan 2026-10-22, skolstart sedan 2026-10-23) | Visa första lektionen, veckans schema och när barnet ska upp | Barn | Lektioner (dag, tid, ämneskod, sal) från skollänken; skolstartstider, A/B-vecka, väckning, sovmorgon/lediga dagar som en vuxen lagt in | Avtal med föräldern | Supabase, Vercel; SchoolSoft/Studybee | Lektioner en vecka bakåt och tre fram; undantag 7 dagar efter datumet; raderas med barnkontot |
| 4f | Resor (sedan 2026-10-11) | Förbereda en familjeresa | Familjemedlemmar | Resmål, datum, resenärer, flyg och tider, packlista, idéer/röster, **passets utgångsdatum** (aldrig passnummer) | Avtal | Supabase, Vercel, push | Tills resan tas bort; passdatum raderas med kontot |
| 4g | Växelvis boende (förberett 2026-10-23, **inte aktivt**) | Visa var barnet bor och styra notiser/skjuts | Barn, föräldrar (även förälder utan konto, som namn) | Mönster, startdag, bytestid, förälder A/B, undantag per dag | Avtal med föräldern | Supabase, Vercel | Tabellerna skapas först när `FEATURE_CUSTODY` slås på; uppdatera `/privacy` före det |
| 5 | Listor | Inköps- och önskelistor; sedan 2026-10-09 kan barnets önskelista delas med släkt (inbjudan via mejl, egen gratis inloggning, barnet ser aldrig vem som reserverat) | Alla, släkt | Varor, önskningar, reservationer, släktingens namn och e-post | Avtal | Supabase, Vercel, Open Food Facts (vid skanning, från webbläsaren) | Som #1 |
| 6 | Bilder | Profilbild och familjefoto | Alla, även barn | JPEG-bild (komprimerad) | Samtycke (6.1 a); för barn vårdnadshavarens | Supabase, Vercel | Tills de tas bort; rensas automatiskt när personen/familjen raderats |
| 7 | Vårdnadshavarens bekräftelse | Visa att en förälder godkänt barnets konto | Barn, förälder | Barn-id, förälder-id, familj, version, tid | Rättslig förpliktelse/ansvarsskyldighet (6.1 c/f) | Supabase | Så länge barnkontot finns |
| 8 | Säkerhet | Verifierad e-post, admingodkännande, radering, spärr vid felaktiga inloggningar | Alla | Tidpunkter, status, vem som godkände | Berättigat intresse (6.1 f) | Supabase, Vercel | Som #1; inloggningsspärr i minnet 15 min |
| 9 | Idétavlan | Förslag och röster | Inloggade | Titel, text, namn, röster | Berättigat intresse | Supabase, Vercel | Som #1 |
| 10 | Egen reklam | Visa och rapportera annonser | Gratis-vuxna (inga personuppgifter sparas) | Bara totalsiffror visningar/klick | Berättigat intresse | Supabase | Så länge annonsen finns |
| 11 | Administration (inkl. "View as" i egen familj sedan 2026-10-03, loggas) | Support, beviljning av Pro, återställning | Alla | Allt ovan, läsbart för admin i `/admin` | Berättigat intresse / avtal | – | – |
| 12 | AI-intag (skanna veckobrev/skolmejl, 2026-10-10) och "Skriv vad som helst" (2026-10-11) | Läsa av datum ur ett dokument eller en skriven rad som personen själv skickar | Vuxna och barn (texten kan nämna barn) | Bild/PDF i minnet under ett anrop; för "Skriv vad som helst" bara den skrivna texten och dagens datum – namn på personer och listor matchas på vår server; förslag som personen granskar | Avtal med föräldern | Anthropic (USA, SCC i DPA, ingen träning), Vercel | Bilden sparas inte; sparade poster som #4 |
| 13 | Notiser och mejlval (push sedan 2026-10-09, val per typ sedan 2026-10-22) | Skicka påminnelser, kvällsnotis och ändringar till telefonen; respektera vad var och en vill ha | Alla som slår på notiser | Push-prenumeration per enhet (adress + nycklar från webbläsaren), notis- och mejlval per typ | Samtycke (slås på av personen) / avtal | Supabase, Vercel; webbläsarens push-tjänst (Apple, Google, Mozilla) | Tills notiser stängs av eller kontot raderas |

**Inte behandlat:** personnummer, adress, ålder, betalkortsuppgifter (kommer via Stripe senare → ny rad), spårning/analys, tredjepartsreklam.

---

## 3. Barn

- Barn läggs alltid till av en vuxen i familjen (☰ → Family members → "A child"). Den vuxne måste kryssa i att hen är vårdnadshavare och godkänner integritetsmeddelandet för barnet. Bekräftelsen sparas i tabellen `parental_consents` (vem, när, version).
- Barn som fanns före 2026-09-29 har ingen sparad bekräftelse – en förälder ser "Confirm as guardian" på Family members.
- Egen registrering: registreringssidan säger att man måste vara 13 år för att skapa ett konto själv. Det är nytt 2026-09-29 och kan tas bort om Mikael vill. **Beslutet från 2026-08-02 om ingen åldersgräns för barnprofiler (som föräldern skapar) gäller fortfarande.**
- SchoolSoft (2026-10-03): bara en vuxen kan koppla, byta eller ta bort barnets länk. Länken sparas bara på servern och visas aldrig för någon i familjen. Bara `*.schoolsoft.se` och (sedan 2026-10-10) `*.studybee.io` / `*.studybee.se` hämtas. Barnet ser de importerade posterna men kan inte ta bort dem.
- Skolschema (2026-10-22): lektionerna visas bara som första lektion och i veckoschemat – aldrig i listor, mejl eller kalender. Barnet ser sitt eget; vuxna i familjen ser barnens. Skolstart (2026-10-23) ändras bara av vuxna.
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
- [ ] Uppdatera `/privacy` (sv + en) så att den nämner: webb-push, klubbkalendrar, Resor med passets utgångsdatum, schemat och skolstart, "Skriv vad som helst" (text till Anthropic) och släktdelningen – höj sedan `CONSENT_VERSION`. Lägg till växelvis boende innan `FEATURE_CUSTODY` slås på.
- [ ] AI-intag och "Skriv vad som helst": skapa Anthropic API-konto, acceptera villkoren (DPA ingår), be om nollagring, gör en kort konsekvensbedömning (DPIA) innan `ANTHROPIC_API_KEY` sätts i Vercel.
- [ ] Godkänn biträdesavtal (DPA) i Supabase, Vercel och Resend; spara PDF:erna i projektmappen (rad 17).
- [ ] Kontrollera i Supabase hur länge backuper sparas; skriv det här och i `/privacy` §5.
- [ ] Kontrollera att `RESEND_FROM_EMAIL` är en adress på assistiq.se.
- [ ] Tvåstegsverifiering (se §4).
- [ ] Juristläsning av `/privacy` före bred lansering – både engelska (`PrivacyEn.tsx`) och svenska (`PrivacySv.tsx`). Ändras texten i sak: ändra båda och höj `CONSENT_VERSION`.

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
