# Test & Verifiering – öppna punkter
**Skapat:** 2026-07-28 | **Uppdaterad:** 2026-10-10 (§16–§20 = releaserna 7–10 okt, §21 = Lotuvi ljust + mörkt; §15 steg 2 och 5: ikonen är nu Lotuvi-symbolen) · tidigare 2026-10-04 (§13 = mobiltestets fynd 4 okt) – allt i §0–§11 är live i produktion (§7–§8 sedan 28/9, §9 = mobiltestets fynd rad 36–48, §10 = barnkonton/Google, §11 = GDPR). PIN-rader i §2–3 är inaktuella – PIN pensionerad. Inget av nedan är klicktestat i produktion av en människa; §8–§11 är automattestade lokalt med testfamilj.

Bocka av varje rad efter att du testat den skarpt (inte bara läst koden). Rader utan `[x]` betyder "inte verifierat".

---

## 0. Kalendervy (2026-07-28, commit `0a3032e`) — live
- [x] `git push` – gjort, kalendern har varit live sedan juli.
- [ ] Fjärde fliken "Calendar" syns i bottenmenyn, bredvid Reminders/Shopping list/Wishlist.
- [ ] Månadsgriden visar rätt prickar på rätt dagar för en vanlig engångs-reminder (t.ex. ett abonnemangsdatum).
- [ ] En WEEKLY/MONTHLY/YEARLY-återkommande reminder visar flera prickar (en per förekomst) när du bläddrar framåt/bakåt en månad.
- [ ] En syssla (chore) med `choreRecurrenceDays` (t.ex. vardagar) visar prickar bara på rätt veckodagar, i en annan färg än reminders.
- [ ] Klick på en dag visar rätt lista av poster under griden.
- [ ] Klick på en reminder-post öppnar rätt reminder-detalj.
- [ ] Klick på en syssla-post tar dig till Family-hubben (sysslor saknar egen detaljsida ännu — medvetet, se kod-kommentar i `calendar/page.tsx`).
- [ ] "Today"-knappen och pil-navigeringen fungerar, dagens datum är visuellt markerat.
- [x] ~~Som barnprofil: `/dashboard/calendar` ska omdirigera till barnets egen vy~~ – inaktuellt sedan 2026-10-04: barn får kalendern (se §13).
- [ ] Ingen synlig data-läcka: en PRIVATE reminder från en annan hushållsmedlem ska inte dyka upp i din kalender (samma regel som `/api/reminders` redan följer).

## 1. Vercel-deploy
- [ ] Kolla Vercel-dashboarden: senaste deployen (`3a770b4` eller senare) visar "Ready", inte "Error".
  - Tidigare tre deploys blev röda på grund av `passwordSchema`-exportfelet – detta är den enda riktiga bekräftelsen på att fixen fungerade.

## 2. Wishlist-fixen (2026-07-28)
- [ ] Som förälder: öppna Wishlist för ett barn som *aldrig* loggat in själv → listan ska ändå finnas ("No child profiles yet" ska inte visas felaktigt).
- [ ] Som förälder: klicka "+ New list" och skapa en ny önskelista åt ett barn.
- [ ] Redigera ett barnkonto (namn/email) via Profile → Child accounts → "Edit". *(PIN borttaget 2026-09-27 – byte av email skickar ny inbjudan.)*

## 3. Fem quick wins (Best4Family-analys, 2026-07-28)
- [x] ~~Logga in via PIN på ett Google-länkat konto~~ – inaktuell, PIN pensionerad 2026-09-27.
- [ ] Sekretess-chip: skapa en PRIVATE och en PARENTS reminder i ett hushåll med flera medlemmar → taggen ska synas på rätt rader, inte på HOUSEHOLD-reminders.
- [ ] Dataexport: Profile → Security → "Export my data" → verifiera att JSON-filen innehåller profil, reminders, tillagda inköps-/önskelistevaror och hushållsmedlemskap – inte andra medlemmars data.
- [ ] Broadcast-notis: skicka en "family update" som OWNER/PARENT → verifiera att alla vuxna utom avsändaren får mailet, och att barnprofiler inte får det.

## 4. Äldre, aldrig skarpt testade delar
- [ ] Glömt lösenord end-to-end (begär → mail → återställ → logga in med nytt lösenord).
- [ ] PWA på en riktig telefon (installation, offline-ikon, service worker).
- [ ] Hamburgermeny – alla länkar (Family/Settings/Admin/Sign out), Admin bara synlig för admin-email.
- [ ] Ny startsida – rubrik, feature-pills, telefonmockup *(omgjord 2026-10-04, se §13)*.
- [ ] Mobil/webb-vy-växlare i Profile → Preferences.

## 5. Multi-lista / åtkomststyrning (4l)
- [ ] Skapa en andra inköpslista i samma hushåll.
- [ ] Dela en enskild lista (inte hela hushållet) via länk.
- [ ] Åtkomstpanel: begränsa en lista till valda medlemmar, verifiera att övriga inte ser den.
- [ ] Lägg till en vara med notis, länk och bild-URL – verifiera att alla tre visas korrekt.

## 6. Familjebegränsningar + UI (2026-08-18, commit `35fb226`, live)
- [ ] Tilldela en syssla, en aktivitet och en läxa till en **vuxen** (inte barn) – syns rätt för den personen.
- [ ] Önskelista som vuxen: fliken "My wishlist" – skapa en egen önskning; fliken "Family" visar övrigas.
- [ ] Family → "Add child" direkt i översikten.
- [ ] Nytt syssla/aktivitet-formulär: ingen typväxlare, rätt typ skapas från respektive ingång.
- [ ] Inköpslista → Browse: tvåkolumnslista, fler varor per kategori.
- [ ] Kalender → månadsvy: titlar syns i dagrutorna.

## 7. Punkt 31 – LIVE 2026-09-28 (automattestat lokalt, klicktesta skarpt)
- [ ] Registrera nytt konto → "Check your inbox" → klicka länken → "Email confirmed" → logga in.
- [ ] Logga in innan bekräftelse → felmeddelande + "Resend confirmation email" fungerar.
- [ ] Skapa barnkonto (namn + e-post) → barnet får mail → väljer lösenord → loggar in → hamnar i barnvyn med Läxor & prov överst.
- [ ] Profile → Child accounts: "Not confirmed yet · Resend invite" för gamla PIN-barn.
- [ ] Gammal länk `/family?h=...` → login-sidan med förklaring om att PIN är pensionerad.
- [ ] Radering som vanlig medlem → "Deletion requested" → admin ser kortet i Profile/Family → Approve (personen utloggad, dold ur familjen) resp. Decline.
- [ ] Radering som admin med annan vuxen → den vuxne blir admin. Som enda vuxen med barn → blockerad med förklaring.
- [ ] Admin raderar ett barnkonto via "Delete".
- [ ] `/admin` → Deleted: dagar kvar visas, Restore lägger tillbaka personen i familjen, Delete now raderar permanent.
- [ ] Läxor & prov: lägg till läxa + prov med ämne och datum, nedräkning stämmer, bocka av → hamnar under "Done".
- [ ] 📅-knappen döljer/visar posten i kalendern och i ICS-flödet.
- [ ] Mail dagen före kommer till barnet (och till föräldern som skapade posten), inte om posten är avbockad.

## 8. Release 2026-09-28 – planer, provperiod, reklam, tema (LIVE, automattestat lokalt – klicktesta skarpt)
- [ ] ☰-menyn → Auto/Light/Dark byter tema direkt och minns valet efter omladdning. Auto följer telefonens mörka läge.
- [ ] Startsidan: planchip ("Free · Try Pro" / "⚡ Trial · Xd left" / "⚡ Pro") leder till `/upgrade`.
- [ ] Gratisfamilj: en inköpslista fungerar och delas med partnern; "+ New list ⚡" leder till `/upgrade`; Önskelistor/Sysslor/Läxor visar "…is part of Pro" + "Start free 14-day trial".
- [ ] Starta provperioden → allt låses upp, 14 dagar kvar; kan inte startas igen.
- [ ] "I want Pro" → mail till dig → `/admin` → familjen → Grant Pro +30 → familjen ser "⚡ Pro", får mail.
- [ ] `/admin/ads` → skapa en annons → syns på startsidan för en gratis-vuxen men **inte** för barn eller Pro. Klick räknas.
- [ ] Radera en medlem → hens påminnelser blir "Unassigned" men finns kvar; återställ i `/admin` → önskelistan tillbaka.
- [ ] Mörkt läge: gå igenom Home, Calendar, Shopping list, Chores, School, Profile, /upgrade – ingen oläslig text.

---

*När en sektion är helt avbockad, flytta den till "Klart" i `TODO.md` och ta bort raderna härifrån.*

## 9. Testrundan 2026-09-28 kväll – rad 36–48 i Todo-listan (LIVE, klicktestat lokalt i mobilstorlek)
- [ ] Inköpslistan → 🏪 Store mode: bocka en vara → den hamnar under "Already in the cart" längst ned, "Undo" lägger tillbaka den. (36)
- [ ] Inköpslistan: välj en extra lista → "Delete list" → bekräfta. Delad lista kan bara raderas av ägare/förälder; sista listan går inte att radera. (37)
- [ ] *(Menyn ändrad 2026-10-04, se §13.)* Logga in som barn: bottenmenyn visar bara My week / Shopping list / Wishlist, ☰ visar bara egna saker; "My week" visar läxor/prov, aktiviteter och sysslor. (38)
- [ ] Home som förälder: kortet "Homework & tests" visar varje barns kommande prov och läxor (prov i rött). (39)
- [ ] ☰ → Family members: tryck på en bild → välj foto (eget eller barnets). "Family photo" → välj bild → syns överst på Home. (40)
- [ ] Kalendern: prov (🧪, röd) och läxa (📝, indigo) har egna färger och egna filterchips. (41)
- [ ] Kalendern i mobilen: tryck på en dag med två saker → dagens lista visas nedanför med stora rader. (42)
- [ ] Chores → ny syssla till en vuxen → vuxen syns som egen flik, "Mark done" fungerar. (43)
- [ ] Home → familjeraden → "+ Add" → lägg till barn eller vuxen. (44)
- [ ] New activity → "Once a week" → välj dag (t.ex. Thu) → syns på torsdagar i kalendern. (45)
- [ ] New activity → välj två personer → aktiviteten finns hos båda (Activities + kalender). (46)
- [ ] Datumfält (New activity, School) håller sig inom kortet på iPhone. (47)
- [ ] ☰-menyn på liten skärm: hela menyn syns och går att scrolla, hamnar ovanför bottenmenyn. (48)

## 10. Barn med eget konto / Google (2026-09-29, LIVE)
- [ ] Barnet skapar själv ett konto (e-post eller Google) → förälder: ☰ → Family members → "A child" med samma e-post → "already has an account, so we sent an invite".
- [ ] Barnet loggar in (lösenord eller "Continue with Google") → hamnar direkt i familjen som barn (My week), ingen väntan på admin-godkännande.
- [ ] Förälder lägger till ett barn med Gmail-adress som inte har konto → barnet trycker "Continue with Google" på login → inne som barn utan att välja lösenord.
- [ ] Inbjuden vuxen som registrerar sig med e-post behöver inte adminens godkännande.

## 11. GDPR-åtgärder (2026-09-29, LIVE) – se `RELEASE_2026-09-29.md`, `GDPR.md`
- [ ] `/privacy` öppnas utan inloggning, visar version 2026-09-29 och rätt kontaktadress. Länk finns i ☰-menyn, Settings (under Export my data) och på registreringssidan.
- [ ] Family members → "A child": utan kryss i vårdnadshavarrutan kommer ett felmeddelande; med kryss läggs barnet till och raden visar "Guardian confirmed".
- [ ] Ett barn som fanns före 29/9 visar "Confirm as guardian" → tryck → blir "Guardian confirmed".
- [ ] Settings → "+ Add child" leder till Family members.
- [ ] Settings → Export my data: filen innehåller `itemsAssignedToYouByOthers`, `choresYouTickedOff`, `profilePicture`.
- [ ] Home: tjänstelogotyper visas som initialer (inga bilder från clearbit.com).
- [ ] Logga in som barn → My week → "What does the app save about me?" öppnas och länkar till `/privacy`.
- [ ] Vercel → Project → Settings → Functions: region Frankfurt (fra1).
- [ ] Efter nästa cron-körning (08:00 UTC): loggen visar inga "GDPR cleanup ERROR".

## 12. Barnets startsida + SchoolSoft (2026-10-01–03, LIVE) – se `RELEASE_2026-10-01.md`, `RELEASE_2026-10-03.md`
- [ ] Family members som familjeadmin: **Delete** på ett testbarn → borta, kan inte logga in; återställ från `/admin`. **Remove** på en vuxen → ut ur familjen, kontot finns kvar.
- [ ] Logga in som barn: "Hi <namn>" med bilden, familjebilden, tre rutor, läxor & prov först, sysslor kompakt. Byt bild från startsidan → syns hos föräldern också.
- [ ] Settings visar den riktiga bilden (inte en bokstav).
- [ ] Menyn nere: Home längst till vänster för vuxna och barn. Settings → välj appar: Calendar går att välja bort/till.
- [ ] Vuxnas Home: "Upcoming tests" visar bara prov, max två per barn.
- [ ] School → SchoolSoft → Connect på ett barn → klistra in länken → "Connected. Synced: N new". Posterna märks "SchoolSoft" och syns hos barnet.
- [ ] Är prov/läxa rätt gissat? Tryck på en post → ändra typ → Save → "Sync now" (efter 10 min) skriver inte över.
- [ ] Ta bort (×) en importerad post som vuxen → "Sync now" → kommer inte tillbaka. Som barn finns inget × på importerade.
- [ ] Lägg till en egen läxa → **Remove imported** → bara SchoolSoft-posterna försvinner, den egna ligger kvar → "Sync now" hämtar igen.
- [ ] Byt urval i SchoolSoft (t.ex. Schema av) → Remove imported → Sync now.
- [ ] Disconnect (OK = ta bort importerade / Avbryt = behåll).
- [ ] Efter nästa cron (08:00 UTC): loggen visar "SchoolSoft feeds: … synced".
- [ ] **View as:** Family members → "👁 View as" på ett barn → röd list högst upp, barnets Home. "Switch…" → annat barn. "Back to me" → tillbaka på Family members som admin. Knappen syns inte för andra vuxna.


## 13. Mobiltestets fynd 4 okt (2026-10-04) – se `RELEASE_2026-10-04.md`
- [ ] Home → Coming up: tryck på ett kort → detaljsidan öppnas, Edit och Delete fungerar (även för en post som någon annan i familjen lagt upp).
- [ ] Som barn: öppna en delad påminnelse → syns, men ingen Edit/Delete ("Shared with you…").
- [ ] En månadsprenumeration med startdatum i april visar nästa datum (t.ex. 16 okt) på Home, i listan, på detaljsidan ("Next: …") och i kalendern. Inte "Overdue".
- [ ] Rutan Overdue räknar bara engångsposter som passerat.
- [ ] Efter nästa cron (08:00 UTC): loggen visar "rolled forward …" för gamla återkommande poster, inga fel.
- [ ] Settings → Bottom nav som vuxen: första (grå) knappen heter **Home**, Calendar finns bland valen, ingen dubblett.
- [ ] Som barn utan eget val: menyn nere är **Home, Calendar, School, Activities**. Settings visar samma val; Chores finns inte bland barnets val.
- [ ] Som barn: byt t.ex. Activities mot Wishlist → menyn nere ändras.
- [ ] Som barn: Calendar visar barnets egna saker + delade, ingen +-knapp, tryck på en syssla → barnets Home.
- [ ] Home utan sysslor: ingen "Chores this week". Med en syssla för ett barn: bara det barnet visas.
- [ ] Home utan påminnelser: varken Coming up, siffrorna eller All reminders visas.
- [ ] Fler än 5 påminnelser: "See all (N)" fäller ut, "Show fewer" fäller ihop.
- [ ] Utloggad: startsidan har "Log in" uppe och nere. "See how it works" visar nya sidan. Free/Pro-tabellen = `/upgrade` inne i appen.
- [ ] Ljust och mörkt läge på `/` och `/features` i mobilen.
- [ ] Chores: × på en syssla → bekräfta → borta. Sysslor/aktiviteter/läxor utan person (eller för någon som lämnat familjen) syns under "Not assigned to anyone in the family" och kan tas bort.


## 14. Svenska + flerspråksstöd (2026-10-04) – se `RELEASE_2026-10-04b.md`
- [ ] Som familjens admin: Family members → längst ner "Language" → Svenska → hela appen byter till svenska direkt (meny, Home, kalender, inköpslista, Settings).
- [ ] Som annan vuxen/barn: samma ruta visas men går inte att ändra ("Bara familjens administratör…").
- [ ] Annan enhet i familjen: öppna appen igen → svenska.
- [ ] Datum och veckodagar på svenska (t.ex. "mån 6 okt"), belopp med svensk formatering.
- [ ] Inköpslistan: standardkategorierna och katalogen på svenska; en egen omdöpt kategori behåller sitt namn.
- [ ] Ett felmeddelande (t.ex. fel lösenord vid inloggning) visas på svenska.
- [ ] Mejl: skicka en inbjudan / glömt lösenord → mejlet på svenska.
- [ ] `/privacy` på svenska när språket är svenska.
- [ ] Utloggad: startsidan har ingen språkknapp men raden "Finns på svenska och engelska – välj språk i Inställningar" (svensk webbläsare) / "Also available in Swedish…" (engelsk).
- [ ] Utloggad: språkknappen på login och register byter språk och minns valet.
- [ ] Byt tillbaka till English → allt på engelska igen.

## 15. PWA – installera på mobilen (2026-10-04)
**iPhone (Safari):**
1. Öppna www.assistiq.se → efter ~2 s visas "Lägg till på hemskärmen" med 3 steg.
2. Dela → Lägg till på hemskärmen → (Öppna som webbapp på) → Lägg till. Ikonen ska vara Lotuvi-symbolen (tre blad) – *ändrad 2026-10-10*; redan installerad app kan behöva läggas till igen.
3. Öppna från ikonen: ingen Safari-ram, hamnar på Home (eller login första gången). Logga in en gång – stäng appen helt och öppna igen: fortfarande inloggad.
4. Inne i den installerade appen ska rutan aldrig visas.
**Android (Chrome):**
5. Öppna sajten → rutan "Lägg till på mobilen" med knappen Installera → systemdialogen → ikon på hemskärmen (rund/ovanlig form ska inte klippa bladen).
6. Långtryck på ikonen: genvägarna Shopping list och New reminder.
**Båda:**
7. "Inte nu"/"Stäng" → rutan syns inte igen på 14 dagar.
8. Flygplansläge → öppna appen → offlinesidan "Ingen anslutning" i stället för webbläsarens felsida.
9. Logga ut → logga in som annan användare: ingen data från förra användaren syns (sidor cachas inte längre).

## 16. Klockslag + redigera (2026-10-07) – se `RELEASE_2026-10-07.md` "Att testa på mobilen"
- [ ] Aktivitet med tid 17:30–19:00 syns med tid i listan och kalendern; redigering sparas.
- [ ] Påminnelse 14:30 och prov 08:20 visar tiden; ICS-prenumerationen lägger dem på rätt klockslag.

## 17. Närmast per barn, klubbkalendrar, filter (2026-10-09) – se `RELEASE_2026-10-09.md`
- [ ] Klubbkalender kopplad → träningar under barnet, i kalendern och på Hem; egen ändring överlever "Synka nu".
- [ ] Kalenderfilter per barn; Inställningar → Startsidan döljer valda delar.

## 18. Måstelistan (2026-10-09b) – se `RELEASE_2026-10-09b.md`
- [ ] Nytt konto kommer in direkt; barn utan mejl; Kom igång-guiden; push + testnotis; kvällsnotis 19:00.

## 19. Stjärnor, släktdelning, "I dag" (2026-10-09c) – se `RELEASE_2026-10-09c.md`
- [ ] Stjärna vid avbockad syssla; veckopeng; släkten reserverar på `/gifts` och barnet ser inget; "I dag" på Hem.

## 20. AI-intag (2026-10-10) – se `RELEASE_2026-10-10.md` (kräver `ANTHROPIC_API_KEY`)
- [ ] Fota veckobrev → förslag → spara → syns i kalender/Skola/"I dag". PDF och skärmdump.

## 21. Lotuvi ljust + mörkt (2026-10-10) – se `RELEASE_2026-10-10b.md`, `RELEASE_2026-10-10c.md`
**Ljust:**
- [ ] Startsidan: tre blad + figuren; "Kom igång gratis" korall med vit text.
- [ ] Hem, kalender, inköpslista: cream bakgrund, mörkblå text, korall på vald flik och +-knappen.
**Mörkt (Inställningar → Utseende → Mörkt):**
- [ ] Bakgrund grön-charcoal, kort något ljusare, inte helsvart.
- [ ] Vald flik i bottenmenyn, +-knappen och primärknappar mint **med mörk text/ikon**.
- [ ] Kalender: dagens datum mint med mörk siffra; valda snabbval i Ny påminnelse läsbara.
- [ ] Pro-chippet champagne, inte mint.
**Båda:**
- [ ] Auto följer telefonen; ett aktivt val vinner över telefonen och sparas.
- [ ] Ny hemskärmsikon (tre blad) efter att appen lagts till igen; favicon i webbläsarfliken.

## 22. Födelsedagar (2026-10-10d) – se `RELEASE_2026-10-10d.md`
- [ ] Meny → Födelsedagar; lägg in ett barn med årtal → "fyller N · om N dagar".
- [ ] Släkt, Kompis (Gäller: barnet → "Elsas kompis") och Husdjur 🐾 → rätt chip och emoji.
- [ ] Kalendern: "🎂 Elsa fyller 13" på rätt dag; personfiltret visar den under Elsa.
- [ ] Födelsedag om 7 dagar → nästa morgon mejl och push till vuxna; barn med önskelista → knapp till önskelistan.
- [ ] "Gäller: mamma" → syns inte för pappa (Hem, kalender).
- [ ] Som barn: kan lägga in en kompis, kan inte ändra familjens.
- [ ] På dagen: push "… i dag! Glöm inte att gratulera 🎉".

