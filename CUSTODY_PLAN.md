# Växelvis boende (lanseringslistan rad 52) – förberett, inte live

**Status 2026-10-23:** koden ligger i `master` men är avstängd. Den slås på med `FEATURE_CUSTODY=true` i Vercel (Production eller bara Preview för test). Utan flaggan svarar API:t 404, kortet syns inte och inga tabeller skapas.

## Vad som finns
- **`lib/custody.ts`** – schema per barn: mönster (varannan vecka 7/7, 2-2-3, 2-2-5-5), första dagen hos förälder A, vem A och B är (en vuxen i familjen eller ett namn, t.ex. "Mamma" som inte har konto), bytestid och enstaka undantag per dag. Rena funktioner: `sideOn`, `custodyDays` (med `handover` = bytesdag), `adultOn`.
- **Tabeller** (skapas av sig själva vid första användning): `custody_schedules`, `custody_overrides`.
- **`/api/family/custody`** – GET (schema + kommande 14 dagar), PUT (spara), DELETE (ta bort), POST (undantag en dag). Bara vuxna ändrar.
- **Kortet "Växelvis boende"** på Familjemedlemmar, märkt "Förhandsvisning": välj mönster, föräldrar, startdag och bytestid. Visar två veckor som en remsa där bytesdagarna har ram.
- **I morgon-kortet:** "🏠 Leo flyttar till Pappa 17:00" på bytesdagar, annars "🏠 Leo är hos Mamma".
- **Kontoradering:** barnets schema tas bort och en raderad vuxen kopplas loss.

## Nästa steg innan det kan gå live
1. **Notiser följer boendet:** påminnelser, kvällsnotis och ändringsvakten för ett barn går i första hand till den vuxna barnet är hos (`adultOn`). Den andra föräldern väljer om hen vill ha allt eller bara sina veckor.
2. **Skjuts:** "Jag tar den" föreslår den förälder barnet är hos, och krockvarningen räknar bara med den föräldern.
3. **Kalendern:** en tunn färgrand per dag (A/B) i personfiltret för barnet.
4. **Två hushåll:** i dag måste båda föräldrarna vara i samma familj för att räknas som vuxna. Ett riktigt växelvis boende behöver att ett barn kan delas mellan två familjer med olika behörighet (spec §hushåll/vårdnadshavare). Det är den stora delen och kräver ett eget beslut.
5. **Undantag i UI:** API:t stöder byte en enstaka dag (POST), men kortet har ännu ingen knapp för det.
6. **Integritetstext och GDPR.md:** lägg till boendeschemat innan det slås på för riktiga användare.

## Testa (Preview med flaggan på)
1. Familjemedlemmar → Växelvis boende → "+" på ett barn → Varannan vecka, A = du, B = "Mamma", startdag en fredag, byte 17:00 → Spara. Remsan visar 7 + 7 dagar och ram på fredagarna.
2. Dagen före en bytesdag: Hem → I morgon visar "🏠 … flyttar till … 17:00".
3. Utan flaggan: kortet syns inte och `/api/family/custody` ger 404.
