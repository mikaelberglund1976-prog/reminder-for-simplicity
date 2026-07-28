# Todo – Reminder for Simplicity
**Skapad:** 2026-07-26, efter granskning av kodbas + git-status vid flytt till ny dator.
**Uppdaterad:** 2026-07-27 (kväll) – hamburgermeny + admin-åtkomst byggd, alla md-filer (PRODUCT_SPEC, ROADMAP, BRAND, OPERATIONS, TODO) synkade mot nuläget. Sektionerna nedan är nu i kronologisk ordning (döpte om 4d0→4e osv, som tidigare låg fel i ordning).
**Uppdaterad igen:** 2026-07-27 (sen kväll) – punkt 16 klar: delningslänk, kategori-katalog/Recent-chips och PIN-inloggning klicktestade på skarpa `www.assistiq.se` (commit `1ad791d`). Se 4i/4j nedan för detaljer och en liten kosmetisk bugg som hittades under testet.
**Uppdaterad igen:** 2026-07-27 (natt) – git-auto-deploy till Vercel löst (se punkt 5): Disconnect/Connect av Git-integrationen i Vercel-dashboarden löste webhook-problemet. `git push` till `master` räcker nu för att deploya, ingen manuell `vercel --prod` behövs längre.
**Uppdaterad igen:** 2026-07-28 – två omgångar byggda på inköpslistan/önskelistan efter feedback: kategorihantering + tight layout + optimistisk UI (se 4k), sedan flera listor per hushåll med åtkomststyrning + notis/länk/bild på varor (se 4l). Båda kräver ett nytt `npm run db:push` + backfill-script innan de fungerar i produktion, se punkt 6.
**Uppdaterad igen:** 2026-07-28 – konkurrentanalys av Best4Family (best4family.com) genomförd på begäran: design/UX, funktionsgap och en djupdykning i deras privacy-sektion. Inga kodändringar gjorda. Fullständig analys i `COMPETITOR_ANALYSIS_BEST4FAMILY.md`, kondenserad handlingslista i ny punkt 9 nedan och nya rader i `ROADMAP.md`.
**Uppdaterad igen:** 2026-07-28 – Mikael körde `npm run db:push` + `backfill-shopping-categories.js` + `backfill-lists.js` lokalt (se punkt 6). Allt gick igenom rent ("categories ready", "lists ready", inga fel). Kategorihantering, flera listor per hushåll och delningslänk på den nya listmodellen (4k/4l) är nu redo att fungera i produktion – klicktest återstår, se punkt 4l och punkt 7.
**Uppdaterad igen:** 2026-07-28 – fem "quick wins" från Best4Family-genomgången byggda i en omgång: PIN/Google-buggen fixad, sekretess-chip på reminders, dataexport (JSON), broadcast-notis till familjen, och en genomgång som visade att "vad händer närmast"-önskemålet redan är löst (IQ Spotlight + Needs your attention). Se ny punkt 10 nedan. `tsc --noEmit` kört rent. **Kräver ingen ny `db:push`** – ingen schemaändring, bara ny kod.

---

## 1. Städa git – klart
- [x] **Radslut (CRLF/LF):** `.gitattributes` (`* text=auto eol=lf`) tillagd, `git add --renormalize .` kört.
- [x] `tsconfig.tsbuildinfo` avregistrerad från git (`git rm --cached`) och tillagd i `.gitignore`.
- [x] `.DS_Store` tillagd i `.gitignore` (rot).
- [x] `app/next-env.d.ts` tillagd i `app/.gitignore`.
- [x] `app/.gitignore` var UTF-16-kodad och innehöll bara `app/.env` – omskriven i UTF-8 med alla rätt rader.

*Obs: sandboxen jag jobbar i har ovanliga filsystembegränsningar (kan inte `rm`/`unlink` filer utan att be om lov, git lämnar kvar tomma `.git/objects/tmp_obj_*`-filer och `.bak`-filer från sed). Detta är specifikt för min miljö, inte ditt repo – på din dator fungerar `rm`/`git status`/`git gc` som vanligt.*

## 2. Miljövariabler – klart
- [x] `app/.env.local` var **också** UTF-16-kodad (samma Windows-kopiering) och innehöll bara 3 av 12 nycklar (`DATABASE_URL`, `NEXTAUTH_URL`, `RESEND_API_KEY`) – resten föll tyst bort. Omskriven i UTF-8 med alla nycklar: `DIRECT_URL` återanvänder samma Supabase-URL (den är redan i direct-format), `NEXTAUTH_SECRET`/`CRON_SECRET` slumpgenererade, `ADMIN_EMAIL`/`NEXT_PUBLIC_APP_URL`/`NEXT_PUBLIC_APP_NAME` ifyllda med kända värden. `GOOGLE_CLIENT_ID`/`SECRET` lämnade tomma (kräver ditt Google Cloud-konto – kan inte fejkas).
- [x] `auth.ts` kraschade förut på `!`-assertion om Google-nycklar saknades. Fixat: Google-provider läggs bara till om båda env-variablerna faktiskt är satta, annars körs bara email/lösenord. Samtidigt översatte jag filens Swedish-kommentarer och felmeddelanden till engelska (matchar språkbeslutet).

## 3. Dokumentation – klart (2026-07-26/27)
- [x] ROADMAP.md, PRODUCT_SPEC.md, BRAND.md, SETUP_GUIDE.md, OPERATIONS.md uppdaterade mot faktisk kodbas-status, flera gånger under de här två dagarna i takt med att appen ändrats.
- [x] Färgpalett beslutad: `#4A5FD5` (från `RFS-Product-Direction.md`). Genomfört i `globals.css`, `BRAND.md`, alla `.tsx`-filer i `app/src` och `public/manifest.json`.
- [x] **AssistIQ-kvarlevor borttagna** – fanns i `schema.prisma`, `sw.js`, `manifest.json`, `layout.tsx`, laddningstexter, header-loggor, `email.ts`s transaktionsmail. Allt bytt till "Reminder for Simplicity".
- [x] `landing-page.html` (inaktuell, svensk, gammal palett) borttagen.
- [x] **Språkbeslut:** Engelska är primärspråk. Genomfört i spec, brand-guide och email-mallar.
- [x] `OPERATIONS.md` skriven, och sedan korrigerad 2026-07-27 kväll (deploy-sektionen sa fel branch-namn och en trigger som inte längre fungerar – se punkt 6 nedan).

## 4. Produktluckor från startspecen – tre av fyra hanterade
- [x] **Glömt lösenord-flöde byggt:** `/forgot-password` + `/reset-password`, `PasswordResetToken`-schema, mail via Resend. Klicktest: se punkt 7.
- [ ] **Stripe/betalflöde** – medvetet inte byggt. Kräver ditt Stripe-konto och prissättningsbeslut. Vänta till Fas 2 (efter beta) enligt roadmapen.
- [ ] **Push-notiser** – medvetet inte byggt (Fas 2-item). Går tekniskt utan externt konto (web-push + egna VAPID-nycklar) om du vill ha det tidigare.
- [ ] **PWA end-to-end** – kodgranskad, men riktig test kräver en telefon. Klicktest: se punkt 7.

## 4b. Delad inköpslista, grundversion (2026-07-27)
- [x] **Byggd:** `ShoppingListItem`-modell, `GET/POST /api/family/shopping-list`, `PATCH/DELETE /api/family/shopping-list/[id]`, sida `/dashboard/family/shopping-list`. Alla hushållsmedlemmar (även barn) kan lägga till/bocka av/ta bort. Samma Pro/trial-spärr som sysslor.
- Utökad samma dag enligt formell beställning – se 4c nedan.

## 4c. Beställningen "Inköpslista & barnens önskelista" – kategorisering, önskelista, bottenmeny (2026-07-27)

Byggde igenom hela P0-listan. Tog självständiga beslut på alla fyra öppna frågor i beställningen (dokumenterade i `PRODUCT_SPEC.md` 4b.8/4b.9) för att inte blockera på dig:

- [x] **P0.1 Realtidssynk** – ingen websocket/push fanns, löst med 5-sekunders polling (pausas när fliken inte är synlig).
- [x] **P0.2 Kategorisering** – `ShoppingCategory`-enum + nyckelordsgissning (`lib/shoppingCategories.ts`) + `ShoppingCategoryMemory` som kommer ihåg manuella val per hushåll+varunamn.
- [x] **P0.3 Avbockning** – struken/flyttas ner (fanns redan) + automatisk rensning 24h efter köp via cronen + manuell "Clear bought items"-knapp.
- [x] **P0.4 Bottenmeny** – `app/dashboard/layout.tsx` + `components/BottomNav.tsx`. Tre flikar, notis-prick via `lib/listBadges.ts`.
- [x] **P0.5–P0.7 Önskelista** – `WishlistItem`-modell + `/api/family/wishlist`. Köpstatus stripped server-side ur svaret till barnet, inte bara dold i UI.
- [ ] **P1/P2-punkterna** (streckkod, receptimport, delningslänk, butiksläge, röststyrning, platsnotiser, skafferi, måltidsplanering) medvetet **inte** byggda – ligger i `ROADMAP.md` Fas 2/3, enligt beställningens egen prioritering.

**Öppna frågor från beställningen – mina beslut:**
1. *Barnprofiler?* Fanns redan (`isChildProfile` + `CHILD`-roll).
2. *Realtidssynk?* Polling (5s) – ingen websocket-infra fanns.
3. *Delningslänkar till släktingar?* P1, ej byggd. Rekommendation: återanvänd `HouseholdInvite`-mönstret när det blir aktuellt.
4. *Rensningsregel avbockade varor?* 24h auto + manuell knapp.

## 4d. Startsida & positionering breddad (2026-07-27)
- [x] Beslut: sluta positionera appen som "bara en reminder-app" – se `PRODUCT_SPEC.md` §1/§3.
- [x] `page.tsx`: ny rubrik, tre feature-pills (🔔🛒🎁), telefonmockup visar inköpslista+önskelista, nya flytande dekorationer.
- [x] `layout.tsx`: SEO-titel/description/OpenGraph uppdaterade till samma budskap.

## 4e. Bottenmeny-krock + första desktop-fix (2026-07-27)
- [x] **Bugg:** `/dashboard/page.tsx` hade sin egen inbyggda bottenmeny (Reminders/History/Settings/+) som krockade visuellt med den nya delade menyn – båda låg `position:fixed` på samma plats. Löst: gamla menyn borttagen, "lägg till"-knappen är nu en flytande rund knapp ovanför den delade menyn. ("History"-fliken gjorde inget funktionellt, bara färgändring – inget förlorat.)
- [x] **Desktop:** menyns vita fält gick tidigare kant-till-kant över hela skärmen medan flikarna låg klumpade i mitten. Löst: fältet är nu breddbegränsat till samma bredd som resten av appen, centrerat, rundade hörn, skugga.
- Öppen fråga om en riktig desktop-layout ställdes här – se 4f, som är det (avsiktligt begränsade) svaret.

## 4f. Mobil/webb-vy-växlare (2026-07-27)
- [x] **Byggd:** en `--content-max-width` CSS-variabel styr bredden på **alla** sidor (bytte `maxWidth: 480` → `maxWidth: "var(--content-max-width)"` i 16 filer, 24 ställen). Ett `data-view="mobile"|"web"`-attribut på `<html>` växlar variabeln mellan 480px (mobil, förvalt) och 1040px (webb) – live, ingen omladdning.
- [x] Väljare under Profile → Preferences → "Display": 📱 Mobile view / 🖥️ Web view. Sparas per enhet i `localStorage` (`lib/viewMode.ts`), ett script i `<head>` sätter attributet innan sidan målas upp (ingen blinkning).
- **Viktigt att förstå gränsen:** "Web view" gör den befintliga kolumnen bredare (480→1040px) – det är **inte** en omdesignad flerkolumns-layout. En riktig egen desktop-layout (sidopanel, grid) är ett separat, större projekt om det blir aktuellt.

## 4g. Hamburgermeny + admin-åtkomst (2026-07-27, kväll)
- [x] **Bugg du hittade:** `/admin` gick bara att nå genom att skriva URL:en direkt – ingen länk fanns någonstans i appen efter att bottenmenyn tog över `/dashboard`s tidigare navigering.
- [x] **Byggd:** `components/HamburgerMenu.tsx` – en ☰-knapp i sidhuvudet på `/dashboard`, `/dashboard/family`, `/dashboard/family/shopping-list` och `/dashboard/wishlist`. Öppnar en meny med Reminders/Family/Settings/**Admin** (bara synlig om din inloggade email matchar `ADMIN_EMAIL`, delad konstant i `lib/adminConfig.ts` så den inte kan hamna i otakt med sidans eget skydd)/Sign out.
- [x] Placerad som en vanlig flex-sibling bredvid sidtiteln, inte en fristående flytande knapp – annars hade den riskerat att hamna ovanpå titeltexten på smala mobilskärmer (samma typ av bugg som 4e).
- [ ] Klicktesta: öppna menyn på varje sida den finns på, verifiera att Admin bara syns för dig, testa Sign out.

## 4h. Genomgång av hela listan + försök till push/deploy (2026-07-27, kväll)
- [x] **Upptäckt:** allt arbete från 4d–4g låg okommitterat i arbetskatalogen (inkl. `HamburgerMenu.tsx`, `adminConfig.ts`, `viewMode.ts` som otrackade filer). `tsc --noEmit` kört rent, sedan committat som `68ba5e2`.
- [ ] **`git push` blockerad:** ingen GitHub-autentisering i sandboxen (ingen credential-helper, ingen SSH-nyckel) – `fatal: could not read Username for 'https://github.com'`. Kräver att du kör `git push` själv, eller kopplar GitHub-åtkomst till sessionen.
- [ ] **Produktionsdeploy blockerad:** `npx vercel --prod` saknar token i sandboxen (`No existing credentials found`). Vercel-MCP-kopplingen (läsläge) fungerar och bekräftar att senaste live-deployen fortfarande är commit `2c417ed` – dvs **hamburgermeny/vy-växlare/ny startsida/bottenmeny-fixen är ännu inte skarp**. Kräver att du kör `npx vercel --prod` från `app/` själv, eller ger mig ett Vercel-token.
- **Konsekvens:** punkt 7 (klicktester) går inte att göra meningsfullt förrän deployen är klar – skarpa sajten visar fortfarande gamla versionen.

## 5. Deploy-status – läs detta innan nästa gång du deployar
- [x] **Löst 2026-07-27 (kväll):** automatisk deploy vid `git push` fungerar igen. Orsak: Vercels GitHub-integration hade tappat webhooken (känt, vanligt Vercel-fel – appen visade "ansluten" men skapade aldrig webhooken på GitHub-sidan). **Fix:** riktig **Disconnect** + ny **Connect Git Repository** i Vercel-dashboarden (Project Settings → Git). Testat och bekräftat: en vanlig `git add` / `git commit` / `git push` triggade en ny deployment automatiskt utan att `npx vercel --prod` kördes manuellt.
- **Nuvarande rutin:** pusha till `master` som vanligt – Vercel deployar automatiskt. `npx vercel --prod` behövs inte längre i normalfallet, men fungerar fortfarande som manuell nödlösning om webhooken någon gång skulle sluta fungera igen.
- **Obs, en sak att hålla koll på:** det här är ett känt återkommande Vercel-fel (bekräftat i Vercel Community-trådar 2026). Om auto-deploy tystnar igen i framtiden: gör om samma Disconnect/Connect-steg först. Om det händer ofta kan ett Vercel Deploy Hook + GitHub Action vara en mer robust backup, men det kräver att GitHub-token:et som används för `git push` har `workflow`-scope (det som fanns saknade det) – annars behöver workflow-filen läggas upp direkt på github.com istället för via `git push`. Inte byggt just nu, medvetet nedprioriterat.
- [x] `OPERATIONS.md` §5 uppdaterad till samma nuläge.

## 6. Tekniska skulder, inte akuta
- [ ] **Säkerhet:** `npm audit` visar att Next.js 14.2 har flera kända CVE:er (DoS, cache-poisoning, SSRF). Full fix kräver major-uppgradering till Next 16 – för stort/riskabelt utan regressionstestning. Prioritera som egen sprint innan skarp lansering med riktiga användare.
- [ ] Prisma flaggar 5.22.0 → 7.9.0 (major). Samma resonemang som ovan – låg prioritet så länge 5.22 fungerar.
- [x] ~~Kör `npx prisma generate && npx prisma db push`~~ **Klart 2026-07-27** – kört av Mikael lokalt, gick igenom rent.
- [x] **Kör igen efter 2026-07-28-ändringarna:** `npm run db:push` (lägger till `ShoppingCategoryDef`, `List`, `ListMember`, nya kolumner – additivt, tar inte bort något), sedan **i den här ordningen**: `node scripts/backfill-shopping-categories.js` följt av `node scripts/backfill-lists.js`. **Klart 2026-07-28** – kört av Mikael lokalt (från `app/`-mappen, inte projektroten – `package.json` ligger i `app/`). Alla tre kommandon gick igenom rent.
- [ ] Kör `npm install` lokalt för att synka `node_modules` om det inte redan är gjort. **Försökt i sandboxen 2026-07-27 kväll och avbröts** – `node_modules` innehåller redan native-binärer byggda för darwin-arm64 (din Mac), medan sandboxen är linux-arm64, så en install här hade ändå inte hjälpt dig. Genuint ett "kör på din egen dator"-jobb.
- [x] **Kosmetisk bugg (hittad 2026-07-27 sen kväll):** efter inloggning via PIN visar Profile → Security "Change password" istället för "Signed in with Google" för ett Google-konto. Se 4j för detaljer. **Fixat 2026-07-28** – se punkt 10.
- **Städtips (inte akut):** sandboxen jag jobbar i kunde inte ta bort `.bak`-filer som skapades under en bulk-sök-och-ersätt (samma gamla filsystemsbegränsning, bekräftat igen 2026-07-27 kväll). De ligger kvar i `app/src/**/*.bak` men är nu i `.gitignore` så de committas inte – kör `find . -name "*.bak" -delete` lokalt om du vill ha bort dem helt.

## 7. Konsoliderad klicktest-lista (allt som kräver en riktig webbläsare/telefon, inte min sandbox)
- [ ] Glömt lösenord end-to-end: skicka mail till dig själv → sätt nytt lösenord → logga in.
- [ ] PWA på mobil: öppna sajten → "Lägg till på hemskärmen" → verifiera att den känns som en app.
- [ ] Inköpslista: lägg till en vara, se att den auto-kategoriseras rimligt, byt kategori manuellt och lägg till samma vara igen (ska minnas valet), bocka av, testa "Clear bought items".
- [ ] Inköpslista med två inloggningar samtidigt (du + en till, eller två flikar): lägg till i en flik, se att den dyker upp i den andra inom ~5 sekunder.
- [ ] Önskelista som barn: logga in som ett barn, lägg till en önskning, verifiera att ingenstans syns "reserverad"/"köpt" även efter att en förälder markerat den så.
- [ ] Önskelista som förälder: markera en önskning som Reserved/Bought, verifiera att en annan vuxen ser det men barnet inte gör det.
- [ ] Bottenmeny: verifiera att den syns och funkar på alla sidor och att notis-pricken dyker upp/försvinner rätt.
- [ ] Hamburgermeny: öppnas på Reminders/Family/Shopping list/Wishlist, Admin-länken syns bara för dig, Sign out funkar.
- [ ] Ny startsida: kolla att den ser bra ut skarpt (bara läst koden, inte sett den renderad).
- [ ] Mobil/webb-vy: växla till Web view på en bred skärm, bläddra runt, växla tillbaka.

## 4i. Inköpslistan jämförd med OurGroceries/Listonic, "gör allt vi kan" (2026-07-27, kväll)
Du skickade skärmbilder av OurGroceries och Listonic och tyckte vår lista kändes "trött och död". Byggde följande:

- [x] **Visuell uppfräschning:** färgade kategorirubriker (`#4A5FD5` + emoji per hylla), tonad grön "redan i kundvagnen"-sektion, "Clear bought items" som pill-knapp. (Committat separat innan den här punkten, se `b1a3bdd`.)
- [x] **Kategori-katalog quick-add:** `lib/shoppingCatalog.ts` – en kurerad lista vanliga varor per hylla (motsvarande Listonics "Katalog"-flik), expanderbar panel under "+"-formuläret, tryck för att lägga till direkt. Ingen extern produktdatabas, ingen schemaändring.
- [x] **"Recent"-förslag:** `/api/family/shopping-list/suggestions` – chips med senast använda varunamn från `ShoppingCategoryMemory` (motsvarande Listonics "Senaste"-flik). Ingen schemaändring, ingen ny räknare.
- [x] **Delningslänk utan konto:** ny knapp i sidhuvudet (delnings-ikon) → `navigator.share()` på mobil (öppnar OS:ens delningsmeny, samma känsla som Listonics "Dela denna lista"), kopierar länken på desktop. `Household.shoppingListShareToken` + `/api/family/shopping-list/share` (av/på) + publika `/api/public/shopping-list/[token]` + `/shop/[token]`-sidan (ingen inloggning krävs, full läs/skriv). **Kräver `npx prisma db push` (se punkt 6) innan det funkar i produktion — annars 500-fel på dela-knappen.**

**Medvetet inte byggt nu (för stort/behöver beslut från dig):**
- **AI-assistent** (Listonics chattbot för matinköpsförslag) – kräver ett LLM-API-konto (kostnad per meddelande) och ett beslut om vilken leverantör. Inte byggt utan din tillåtelse.
- **Streckkod/foto-scan** – tekniskt möjligt (kamera + gratis Open Food Facts-API, inget nytt konto behövs), men kräver test på en riktig telefon (samma begränsning som PWA-testet i punkt 7). Inte byggt den här omgången.
- **Flera separata listor per hushåll** (som OurGroceries/Listonics "Handla"/"Handla Spanien"/"Önskelista X") – större arkitekturändring (`ShoppingListItem` skulle behöva höra till en namngiven lista, inte bara hushållet). Föreslår som eget jobb om du vill ha det.
- **Premium-nivå/betalvägg** – redan medvetet uppskjutet till Fas 2, se punkt 4 och `ROADMAP.md`.

- [x] **Klicktestat 2026-07-27 (sen kväll), skarpt på `www.assistiq.se`:** delningslänk (aktiverade delning, öppnade `/shop/[token]` i en andra flik, lade till varor utan inloggning, båda syntes i huvudappen med "Added by ..." och notis-pricken tände), kategori-katalogen ("Browse common items" – expanderar, quick-add fungerar) och Recent-chipsen (fylls på med senaste varorna, klick lägger till direkt). Test-varorna städades bort efteråt, delningslänken lämnades påslagen.

## 4j. Auth-genomgång: riktig email för alla + frivillig PIN för vuxna (2026-07-27, kväll)
Du funderade på hushålls-modellen (ett hushåll per person, beslut: behåll det) och landade på: alla konton ska ha en riktig email, och man ska kunna lägga till PIN-inloggning som ett extra alternativ vid sidan av lösenordet. Byggt:

- [x] **Barnprofiler kräver nu riktig email** vid skapande (`/api/family/child-profiles`) istället för den påhittade `child_xxx@reminder-for-simplicity.internal`-adressen. Föräldern skriver in valfri riktig email (sin egen, ett alias som `du+barnnamn@gmail.com`, eller barnets egen om de har en). Barnet loggar fortfarande in vardagligt med namn + PIN precis som innan — email:en är bara kontots verkliga identitet i botten.
- [x] **Frivillig PIN för vuxna:** ny `User.pin`-kolumn (separat från `password`, så det riktiga lösenordet aldrig försvagas eller skrivs över). Profile → Security → "PIN login" — sätt/ändra/stäng av en egen 4-siffrig PIN för snabbt profilbyte på en delad familjeenhet.
- [x] Ny NextAuth-provider `"pin"` (separat från den vanliga `"credentials"`-providern) — kollar `pin`-fältet för vuxna, `password`-fältet för barn (så gamla barnprofiler funkar oförändrat).
- [x] Familje-switchern (`/family?h=...`, numpad-skärmen) visar nu även vuxna med PIN aktiverad, inte bara barn — märkta "Adult" i väljaren. Rättade en bugg jag hittade under bygget: PIN-inloggning omdirigerade alltid till barnens sysslo-vy oavsett vem som loggade in — nu kollar den om profilen faktiskt är ett barn först.
- [x] `/api/profile` returnerar nu `hasPin` så profilsidan vet vad den ska visa.

**Kräver `npx prisma db push` innan det funkar i produktion** (samma körning som täcker `shoppingListShareToken` från 4i — du behöver bara köra det en gång för båda).

- [x] **Klicktestat 2026-07-27 (sen kväll):** satte en egen PIN på Mikaels konto (Profile → Security → "Set a PIN") → sparades korrekt ("PIN login is on"). Loggade ut, gick till familje-länken (`/family?h=...`) – Mikael visas nu i profilväljaren märkt "Adult", precis som tänkt. Loggade in med PIN → hamnade rätt på `/dashboard` (inte barn-vyn) – **bekräftar att redirect-buggen som hittades under bygget verkligen är fixad.** Test-PIN:et togs bort igen efteråt ("No PIN set") eftersom Mikael inte kände till det – han kan sätta sin egen när han vill ha funktionen aktiv.
- [ ] Kvarstår: skapa en riktig barnprofil med email via Profile → "+ Add child" och logga in som barnet via PIN, end-to-end. (Email-valideringen i sig är kodgranskad men inte klickat igenom.)
- **Litet fynd (inte akut):** efter inloggning via PIN visade Security-sektionen "Change password" istället för "Signed in with Google" – kosmetiskt, påverkar inte Google-kopplingen eller kontots säkerhet. Trolig orsak: sidan avgör vilken text som visas utifrån NextAuth-providern i den *aktuella sessionen* (`"pin"`) snarare än hur kontot ursprungligen skapades. Inte fixat än.

## 4k. Kategorihantering, tight layout, optimistisk UI (2026-07-28)

Feedback: kategorierna tog för mycket plats (egna rutor per kategori) och listan kändes trög vid avbockning/tillägg. Visade tre mockup-alternativ i chatten innan bygget (nuvarande rutor / ett kort med textrubriker / helt flödande lista) – du valde mittenalternativet.

- [x] **Layout:** ett kort istället för en färgad ruta per kategori, kategorin är nu bara en liten grå textrubrik. Se `PRODUCT_SPEC.md` 4b.14.
- [x] **Kategorier hushålls-egna:** ny `ShoppingCategoryDef`-modell ersätter den fasta `ShoppingCategory`-enumen. "Manage categories"-panel: lägg till saknade, döp om befintliga, flytta upp/ner.
- [x] **Bokstavsordning** inom varje kategorigrupp (`localeCompare` med svensk locale).
- [x] **Optimistisk UI:** lägg till/kryssa av/ta bort uppdaterar listan direkt, nätverksanropet sker i bakgrunden. Fixar den upplevda fördröjningen — grundorsaken var att varje åtgärd väntade på en POST/PATCH/DELETE **och sedan** en fullständig omhämtning innan något syntes på skärmen.
- [x] **Automatisk 24h-rensning borttagen** – avbockade varor ligger nu kvar tills "Clear bought items" trycks, eftersom man ofta köper samma saker igen.
- [x] **Backfill-script:** `scripts/backfill-shopping-categories.js` – seedar 8 standardkategorier per hushåll, flyttar befintliga varor från gamla `category`-enumfältet till nya `categoryId`. Idempotent, säker att köra flera gånger.
- **Miljöbegränsning som dök upp igen:** sandboxen jag jobbar i kan varken nå Supabase-databasen direkt (DNS/nätverksblockering) eller ladda ner Prisma-motorn (binaries.prisma.sh blockerad) – så jag kan skriva migreringskoden men inte köra `db push`/backfill-scriptet själv. Samma typ av begränsning som redan är dokumenterad i punkt 1, nu bekräftad specifikt för databas-migreringar också.
- **`.git/index.lock` dök upp igen** när du skulle committa – samma fil-lås-problem som tidigare (se punkt 6). Löstes med `rm .git/index.lock` följt av `git add`/`commit`/`push` en och en (inte inklistrat som block, annars fastnar terminalen i `dquote>` om ett citattecken klipps av).

## 4l. Flera listor per hushåll, åtkomststyrning, notis/länk/bild (2026-07-28)

Uppföljande beställning direkt efter 4k: både inköpslistan och önskelistan ska kunna vara flera separata listor, var och en synlig för antingen alla eller bara utvalda familjemedlemmar. Ställde tre avstämningsfrågor innan bygget (hur långt "flera listor" skulle gå, bilder som länk vs. riktig uppladdning, vem som styr åtkomst) — dina svar: båda funktionerna får flera listor, bara bild-länk (ingen filuppladdning), och bara OWNER/PARENT-roller styr åtkomst.

- [x] **Ny `List`-modell** (household-scoped): `kind` (SHOPPING/WISHLIST), `name`, `ownerId` (barnet en önskelista tillhör), `visibleToAll`, `shareToken`, `createdBy`. `ListMember` för uttryckliga medlemmar när `visibleToAll = false`.
- [x] **Åtkomstlogik** (`lib/lists.ts`) – ägare/skapare/OWNER-PARENT ser alltid, annars `visibleToAll` eller uttrycklig medlemskap. **Hittade och fixade en integritetslucka i min egen första version:** en bokstavlig tolkning av `visibleToAll` hade låtit ett barn se ett syskons önskelista av misstag — låst så att `visibleToAll` för en önskelista bara betyder "synlig för vuxna", aldrig andra barn.
- [x] **Delning flyttad till per-lista:** `List.shareToken` ersätter `Household.shoppingListShareToken`. Gammal endpoint `/api/family/shopping-list/share` lämnad som en 410-stub (kunde inte radera filen — se miljöbegränsning i 1/4k — ny logik ligger i `/api/family/lists/[id]/share`).
- [x] **UI:** listväljare (chips) + "+ New list" på båda sidorna, expanderbar "Vem kan se den här listan"-panel (`components/ListAccessPanel.tsx`, delad komponent).
- [x] **Notis/länk/bild på varor:** `note`/`url`/`imageUrl` tillagda på `ShoppingListItem` (fanns redan på `WishlistItem`). Visas som liten text, länk-ikon, 32px miniatyrbild.
- [x] **Backfill-script:** `scripts/backfill-lists.js` – skapar en standard-inköpslista per hushåll (flyttar över den gamla delningstoken) och en standard-önskelista per barn, flyttar befintliga varor dit. Idempotent.
- [ ] **Klicktesta efter deploy:** skapa en andra inköpslista, dela den separat, testa åtkomstpanelen (slå av "alla", lägg till en specifik medlem), lägg till en vara med bild-URL och länk på både inköps- och önskelistan.
- Se `PRODUCT_SPEC.md` 4b.15 och `ROADMAP.md` Fas 1.5 för fullständig beskrivning.

## 8. Nästa steg
- [x] **Beslut 2026-07-27 kväll:** Fas 1 (beta-inbjudningar) väntar. Prioritet är att få de tre kärnflödena – **Reminders, Wishlist, Grocery (inköpslista)** – helt på plats och pålitliga först. Konkret: klar deploy (se 4h) + full klicktest av dessa tre (se punkt 7) innan beta-inbjudningar blir aktuellt.
- [x] Deploy klar och klicktestad (4h, 4i, 4j) – delningslänk, katalog, Recent-chips och PIN-inloggning fungerar skarpt.
- [ ] Kvarstår innan Fas 1-beta: klicktesta barnprofil-med-email end-to-end (se 4j), och gå igenom resten av punkt 7-listan (glömt lösenord, PWA på mobil, bottenmeny/hamburgermeny) som inte är avbockad än.
- [ ] Därefter: ta ställning till Fas 1-beta vs. fortsätta på Fas 2 (t.ex. Wishlist-delningslänk, som fortfarande inte är byggd – se `ROADMAP.md` Fas 2).

## 9. Konkurrentanalys Best4Family (2026-07-28) – handlingslista

Fullständig analys (design/UX, funktionsgap, djupdykning i deras privacy-policy) i `COMPETITOR_ANALYSIS_BEST4FAMILY.md`. Inget av detta är byggt – detta är en prioriterad att-diskutera/att-bygga-lista, inte färdiga beslut. Design-slutsats: vår smalare positionering ("hemmets bas", inte 18 moduler) och våra progressiva formulär är redan ett UX-försprång – behåll disciplinen, kopiera inte bredden.

**P0 – bör in före bred lansering/betalande användare (störst gap, inget av detta finns idag):**
- [ ] Riktig Privacy Policy-sida (vi har ingen idag). Minst: personuppgiftsansvarig, vilka data vi behandlar, rättslig grund, namngivna underleverantörer (Supabase/Resend/Vercel/Google OAuth), lagringstid, användarrättigheter, kontaktväg.
- [ ] Besluta + dokumentera minimiålder för barnprofiler och vem som samtycker (förslag: 13 år, den skapande föräldern samtycker – matchar redan befintligt email-krav i 4b.2).
- [ ] Självbetjänings-"radera mitt konto permanent"-flöde i Profile → Security (finns bara som databaskoncept idag, ingen UI).

**P1 – stark fit / låg-medel komplexitet:**
- [ ] Gästprofiler utan inloggning (mor-/farföräldrar "syns i planeringen" utan eget konto).
- [ ] Belöningar kopplat till godkända Sysslor (naturlig utökning av befintlig `ChoreStatus`-flow).
- [x] ~~Kompakt "vad händer närmast"-sammanfattning överst på dashboarden~~ – **redan löst**, upptäckt 2026-07-28: dashboarden har redan "IQ Spotlight · Up next" (närmaste kommande reminder) + "Needs your attention" (allt inom 7 dagar). Ingen ny kod behövdes, se punkt 10.
- [x] **Dataexport** (JSON-nedladdning av egen data) för portabilitetsrätten. **Byggt 2026-07-28** – se punkt 10.
- [x] **Synlig sekretess-"chip"** (Privat/Hushåll/Föräldrar) på reminders i UI – `visibility`-fältet fanns redan i schemat (4b.5). **Byggt 2026-07-28** – se punkt 10.

**P1, kräver egen spec-diskussion innan bygge (inte "bara bygg det"):**
- [ ] "Föräldrautrymme"-liknande modul för separerade föräldrar/medföräldrar (samordna scheman, spåra avtal). Intressant differentiator som matchar vårt "hemmets bas"-tema, men ett nytt konceptuellt område.

**P2 – naturlig utökning, lägre tidspress:**
- [ ] Måltidsplanerare kopplad till inköpslistan (redan parkerad idé i `ROADMAP.md`).
- [x] **Broadcast-notis från admin till hela familjen.** **Byggt 2026-07-28** – se punkt 10.
- [ ] Admin-switch per funktionstyp ("Tillåt medlemmar att skapa X") utöver befintlig roll-modell.
- [ ] Kostnadssummering per kategori (redan i `ROADMAP.md` Fas 2).

**P3 – parkerat, lågt strategiskt värde för vår målgrupp just nu:** Reseplanerare, Recept, Restauranger, Städplan, Omröstningar, Beslutshjul, Bill Split, Spelverktyg, fria Anteckningar, generella Uppgifter för vuxna. Se full motivering i analysdokumentet.

## 10. Fem quick wins byggda (2026-07-28)

Byggde fem av quick win-kandidaterna från punkt 9 i en omgång. `tsc --noEmit` kört rent efter alla ändringar. Ingen schemaändring – ingen ny `db:push` krävs. Inte klicktestat än, bara kodgranskat.

- [x] **PIN/Google-buggen fixad.** Orsaken var att Profile → Security avgjorde "Signed in with Google" utifrån `session.user.image`, som bara är satt på en session som kom direkt från Google-inloggningen – efter PIN-inloggning var den tom även för Google-länkade konton. Fix: `/api/profile` returnerar nu `hasPassword`, och sidan avgör istället utifrån om kontot saknar lösenord (sant för alla Google-skapade konton, se `auth.ts`).
- [x] **Sekretess-chip på reminders.** `dashboard/page.tsx` visar nu en liten 🔒 Private / 👪 Parents-tagg på reminder-raden, bredvid kategori- och ägar-taggarna som redan fanns. Bara synlig när man är i ett hushåll (annars är allt trivialt privat och taggen vore bara brus) och bara för PRIVATE/PARENTS – HOUSEHOLD (standard-delningsläget) får ingen tagg.
- [x] **Dataexport.** Ny `GET /api/profile/export` – laddar ner en JSON-fil med kontot (profil, reminders, tillagda inköpslist-/önskelistevaror, hushållsmedlemskap – inte andra medlemmars data). Knapp "Export my data" i Profile → Security, ovanför "Delete account".
- [x] **Broadcast-notis.** Ny `POST /api/family/broadcast`, bara OWNER/PARENT. Skickar ett mail (återanvänder Resend-infran, ingen ny kanal) till alla vuxna hushållsmedlemmar utom avsändaren själv – barnprofiler exkluderade (de har ofta en påhittad/alias-email ingen läser dagligen, se 4j). UI: "📣 Send a family update" i Profile → Household, bara synlig för OWNER/PARENT och bara om hushållet har fler än en medlem.
- [x] **"Vad händer närmast" – redan löst, inget byggt.** Kollade dashboarden innan jag började bygga: "IQ Spotlight · Up next" (närmaste kommande reminder, mörk banner högst upp) + "Needs your attention" (allt inom 7 dagar, upp till 3 rader) täcker redan Best4Family-idén. Ingen kod skriven – skulle bara ha blivit en duplicerad tredje sektion.

**Kvar innan detta är klart:**
- [ ] Klicktesta alla fem skarpt: byt lösenord-vy på ett Google-PIN-konto, sekretess-chip i ett hushåll med flera medlemmar, ladda ner exporten och kika på innehållet, skicka en broadcast och verifiera att den kommer fram (och att avsändaren själv inte får den, och att barn inte får den).
- [ ] Committa och pusha (görs direkt efter denna sammanfattning).
