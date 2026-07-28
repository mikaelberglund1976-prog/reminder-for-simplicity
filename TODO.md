# Todo – Reminder for Simplicity
**Skapad:** 2026-07-26, efter granskning av kodbas + git-status vid flytt till ny dator.
**Uppdaterad:** 2026-07-27 (kväll) – hamburgermeny + admin-åtkomst byggd, alla md-filer (PRODUCT_SPEC, ROADMAP, BRAND, OPERATIONS, TODO) synkade mot nuläget. Sektionerna nedan är nu i kronologisk ordning (döpte om 4d0→4e osv, som tidigare låg fel i ordning).
**Uppdaterad igen:** 2026-07-27 (sen kväll) – punkt 16 klar: delningslänk, kategori-katalog/Recent-chips och PIN-inloggning klicktestade på skarpa `www.assistiq.se` (commit `1ad791d`). Se 4i/4j nedan för detaljer och en liten kosmetisk bugg som hittades under testet.
**Uppdaterad igen:** 2026-07-27 (natt) – git-auto-deploy till Vercel löst (se punkt 5): Disconnect/Connect av Git-integrationen i Vercel-dashboarden löste webhook-problemet. `git push` till `master` räcker nu för att deploya, ingen manuell `vercel --prod` behövs längre.
**Uppdaterad igen:** 2026-07-28 – två omgångar byggda på inköpslistan/önskelistan efter feedback: kategorihantering + tight layout + optimistisk UI (se 4k), sedan flera listor per hushåll med åtkomststyrning + notis/länk/bild på varor (se 4l). Båda kräver ett nytt `npm run db:push` + backfill-script innan de fungerar i produktion, se punkt 6.
**Uppdaterad igen:** 2026-07-28 – konkurrentanalys av Best4Family (best4family.com) genomförd på begäran: design/UX, funktionsgap och en djupdykning i deras privacy-sektion. Inga kodändringar gjorda. Fullständig analys i `COMPETITOR_ANALYSIS_BEST4FAMILY.md`, kondenserad handlingslista i ny punkt 9 nedan och nya rader i `ROADMAP.md`.
**Uppdaterad igen:** 2026-07-28 – Mikael körde `npm run db:push` + `backfill-shopping-categories.js` + `backfill-lists.js` lokalt (se punkt 6). Allt gick igenom rent ("categories ready", "lists ready", inga fel). Kategorihantering, flera listor per hushåll och delningslänk på den nya listmodellen (4k/4l) är nu redo att fungera i produktion – klicktest återstår, se punkt 4l och punkt 7.
**Uppdaterad igen:** 2026-07-28 – fem "quick wins" från Best4Family-genomgången byggda i en omgång: PIN/Google-buggen fixad, sekretess-chip på reminders, dataexport (JSON), broadcast-notis till familjen, och en genomgång som visade att "vad händer närmast"-önskemålet redan är löst (IQ Spotlight + Needs your attention). Se ny punkt 10 nedan. `tsc --noEmit` kört rent. **Kräver ingen ny `db:push`** – ingen schemaändring, bara ny kod.
**Uppdaterad igen:** 2026-07-28 – wishlist-bugg felsökt och fixad (tre orsaker, se punkt 11), plus en formell körordning satt upp (punkt 12) som täcker allt kvarstående arbete i prioritetsordning med beroenden markerade.
**Uppdaterad igen:** 2026-07-28 – de tre senaste deployen (`ae01843`, `a2f37f3`, `2d3ef0e`) failade tyst på Vercel (byggfel, inte synligt förrän Mikael kollade Vercel-loggen). Orsak + fix i punkt 13 nedan. Körordningens steg 1 (`git push`) gäller fortfarande, men pushar nu även denna fix.
**Uppdaterad igen:** 2026-07-28 (natt) – EU-marknadsundersökning gjord på begäran (`MARKET_RESEARCH_EU.md`), USP-/prioriteringssammanställning tillagd i `ROADMAP.md`, och en ny delad "Ideas & voting"-sektion (förbättringsförslag + nya funktioner, med röstning) byggd. Se punkt 17 nedan.
**Uppdaterad igen:** 2026-07-28 (natt, uppföljning) – Training-bokningar (ny kategori, återanvänder Chore-infran) och ett utgående ICS-kalenderflöde (Profile → "Calendar sync") byggda efter direkt beställning. School byggdes först som en kategori i vanliga Reminders, men rättades samma kväll efter direkt feedback från Mikael till en egen sektion (egen barn-självbetjäningsyta + egen föräldravy på `/dashboard/school`). Se punkt 18 nedan.
**Uppdaterad igen:** 2026-07-28 (natt, uppföljning 2) – Admin-godkännande av nya konton byggt på begäran ("vi testar och bygger nytt, vill hålla det kontrollerat") – se punkt 16 nedan. **Kräver `npx prisma db push`** (nytt `approved`/`approvedAt`-fält på `User`) innan det fungerar i produktion, se punkt 6. Kunde inte köra `npx prisma generate` i sandboxen (403 mot `binaries.prisma.sh`, känd nätverksbegränsning), så `tsc --noEmit` gick inte att köra rent den här gången – kodgranskad manuellt istället (brace-balans verifierad), verifiera med ett riktigt `tsc --noEmit` lokalt efter `prisma generate`.
**Uppdaterad igen:** 2026-07-28 – bekräftat att senaste committen (`86a9c4a`, admin-godkännande + `/features`) är pushad och **grön i produktion** (Vercel-MCP:n kollad). Sedan en stor UX-genomgång från Mikael (skärmdumpar/liveanvändning) genomgången mot kodbasen och sammanställd – bottenmeny/hamburgermeny, kalender, inköpslista, sysslor/skola/träning, inställningar/familjemedlemskap. Inget byggt än, bara dokumenterat och stämt av mot vad som redan finns. Se ny punkt 19 nedan – flaggar bland annat en omsvängning (inköpslistans delningslänk, byggd i 4i, ska nu döljas) och två stora beslutspunkter (kontosammanslagning Google/lösenord, en person i två familjer samtidigt).
**Uppdaterad igen:** 2026-07-28 – de två stora beslutspunkterna avgjorda (se 19g): multi-family blir bara datamodell-förberedelse nu (ingen växlare/UI), kontosammanslagning blir "flytta allt" med bekräftelseskärm, automatisk trigger vid Google-inloggning. Streckkodsskanning/receptimport/butiksläge (redan i ROADMAP) infogade i 19c, belöningar-för-sysslor infogat i 19d – samma sidor byggs ändå om, så ingen anledning att vänta. Dessutom byggd: `/privacy`-sidan som en strukturell scaffold (`app/src/app/privacy/page.tsx`), länkad från Register och `/features`. Varje sektion som saknar riktigt innehåll eller ett beslut är markerad med en tydlig gul "Needs a decision"-ruta i UI:t, med en samlad checklista längst ner på sidan (7 punkter: juridisk enhet, minimiålder för barnprofiler, Vercel/Resend DPA-status, datalagringstid, självbetjänings-radering, riktig kontaktadress). `tsc --noEmit` kört rent.
**Uppdaterad igen:** 2026-07-28 – hela punkt 19 (utom rewards och inkommande ICS-import) byggd i en lång omgång efter "kör". Se ny punkt 20 nedan för en fullständig genomgång av vad som är klart, vad som medvetet skjutits upp och varför, och vad som krävs innan det fungerar i produktion.
**Uppdaterad igen:** 2026-07-28 – du körde `prisma generate`/`db push` lokalt (klart), men nästa deploy failade i Vercel. Grundorsak hittad och fixad: `useSearchParams()` utan `<Suspense>`-gräns i `/dashboard/new` och `/dashboard/school` (Next 14:s prerender-krav, fångas inte av `tsc`). Se ny punkt 21 nedan. Redo för commit + push.

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
- [ ] **Kör igen efter admin-godkännande-ändringen (2026-07-28, natt):** `npx prisma generate && npm run db:push` (nya `User.approved` (default `true`, additivt, låser inte ut befintliga konton) + `User.approvedAt`-fält). Kör lokalt från `app/`-mappen. Se punkt 16.
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
- [ ] **Admin-godkännande (punkt 16):** registrera ett nytt testkonto med email/lösenord → verifiera pending-skärmen → försök logga in (ska nekas med "pending admin approval") → gå till `/admin` → "Pending approval"-fliken → Approve → verifiera att inloggning nu fungerar och att godkännande-mailet kom fram. Testa även Reject (delete). Testa Google-flödet med ett Google-konto som inte är din admin-email om möjligt.

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
- [x] Committat. **Pusha kvarstår**, se punkt 12.

## 11. Wishlist-bugg: "kan inte skapa kategorier och önskemål" (2026-07-28)

Rapporterad bugg. Grävde fram tre separata orsaker, alla fixade:

- [x] **Huvudorsak:** en önskelista skapades bara automatiskt när barnet *självt* besökte sidan första gången. Om en förälder öppnade Wishlist innan barnet någonsin loggat in där fanns ingen lista att visa – "No child profiles yet" visades trots att barnprofilen fanns. Fix: `/api/family/lists` (GET) skapar nu en standard-önskelista åt varje barn i hushållet, oavsett vem som besöker sidan först.
- [x] **Riktigt UI-gap:** `AdultWishlist` (dashboard/wishlist/page.tsx) saknade helt en "+ New list"-knapp – bara barnvyn hade den, trots att backend redan stödde att en förälder skapar en lista åt ett barn (`ownerId`-param på `POST /api/family/lists`). Tillagd.
- [x] **Sidoupptäckt under felsökningen:** ingen möjlighet fanns att redigera en befintlig barnprofil (namn/email/PIN) – varken backend eller UI, bekräftat att `/api/family/child-profiles` bara hade GET/POST, ingen PATCH. Byggt: `PATCH /api/family/child-profiles/[id]` + "Edit"-knapp per barn i Profile → Household → Child profiles.

`tsc --noEmit` kört rent. Committat (`2d3ef0e`). **Inte klicktestat än.**

## 12. Körordning

Konkret exekveringsordning, satt 2026-07-28 utifrån läget efter wishlist-bugg-fixen. Beroenden är markerade – gör dem i ordning, hoppa inte över ett steg som ett senare steg bygger på.

**Steg 1 – måste göras nu (beroenden, blockerar allt klicktestande):**
1. [ ] `git push` – tre commits väntar lokalt (`ae01843`…`2d3ef0e` quick wins + wishlist-fix, plus en fjärde för Vercel-byggfelet, se punkt 13). Sandboxen kan committa men inte pusha (ingen GitHub-auth). **Kolla Vercel-dashboarden efter push** att deployen faktiskt blir grön ("Ready") – de tre senaste blev det inte, se punkt 13.

**Steg 2 – klicktesta allt som byggts men aldrig körts skarpt (kräver steg 1 klart):**
2. [ ] Wishlist-fixen (punkt 11): förälder ser barnets lista utan att barnet loggat in först, "+ New list" som förälder, "Edit" på en barnprofil.
3. [ ] De fem quick wins (punkt 10): Google/PIN-vy, sekretess-chip, dataexport, broadcast-notis.
4. [ ] Resten av punkt 7-listan: glömt lösenord end-to-end, PWA på mobil, hamburgermeny, ny startsida, mobil/webb-vy.
5. [ ] Multi-lista/åtkomststyrning (4l): andra inköpslista, delning, åtkomstpanel, vara med bild-URL.

**Steg 3 – två beslut som låser upp nästa fas (inget kodas förrän du svarat):**
6. [ ] Fas 1-beta (bjud in 10 testanvändare) vs. fortsätt bygga Fas 2 – se punkt 8.
7. [ ] Minimiålder för barnprofiler + vem som samtycker – låser upp Privacy Policy-texten (P0 nedan).

**Steg 4 – P0 inför bred lansering/betalande användare:**
8. [ ] Riktig Privacy Policy-sida (beror på steg 3.7).
9. [ ] Självbetjänings-"radera mitt konto permanent" – knappen finns i UI men gör fortfarande ingenting (se PRODUCT_SPEC 4b.17).

**Steg 5 – P1, låg-medel komplexitet, ingen extern blockering:**
10. [ ] Gästprofiler utan inloggning (mor-/farföräldrar).
11. [ ] Belöningar kopplat till godkända Sysslor.

**Steg 6 – P2/Fas 2, större jobb, ingen tidspress:**
12. [ ] Måltidsplanerare kopplad till inköpslistan.
13. [ ] Admin-switch per funktionstyp.
14. [ ] Streckkodsskanning, receptimport, butiksläge (kräver telefontest, ej sandbox-görbart).
15. [ ] Riktigt betalflöde (Stripe) – kräver ditt Stripe-konto + prissättningsbeslut.

**Steg 7 – teknisk skuld, ingen brådska men växande:**
16. [ ] Next.js 14.2 → 16 (kända CVE:er).
17. [ ] Prisma 5 → 7 (major).

## 13. Vercel-byggfel: `passwordSchema` inte en giltig Route-export (2026-07-28)

Upptäckt via Vercel-dashboarden (skärmdump från Mikael) – de tre senaste deployen visade "Error" istället för "Ready", trots att `tsc --noEmit` gått igenom rent varje gång. Skillnaden: Next.js App Router kör en egen route-export-validering i `next build` som `tsc --noEmit` inte gör.

- **Felmeddelande (från `get_deployment_build_logs`):** `Type error: Route "src/app/api/auth/register/route.ts" does not match the required types of a Next.js Route. "passwordSchema" is not a valid Route export field.`
- **Orsak:** en route.ts-fil i App Router får bara exportera HTTP-metod-handlers (`GET`/`POST`/...) plus ett fåtal config-fält (`dynamic`, `revalidate`, `runtime`, m.fl.) – inget annat. `register/route.ts` exporterade sedan tidigare `passwordSchema` (ett Zod-schema) rakt av, och `reset-password/route.ts` importerade det därifrån. Detta bröts troligen av en Next.js 14.2.x-patchversion som skärpte kontrollen (`package.json` pinnar inte en exakt version) – inget i den här sessionens ändringar orsakade det, det bara råkade brytas mellan `2b2eb15` (senast gröna deploy) och `ae01843` (första av de tre röda).
- [x] **Fix:** `passwordSchema` flyttad till ny `src/lib/passwordSchema.ts`. Både `register/route.ts` och `reset-password/route.ts` importerar därifrån istället. `tsc --noEmit` kört rent. Kunde inte köra en fullständig `next build` i sandboxen för att verifiera (samma kända begränsning som `db push` – `prisma generate` behöver ladda ner en linux-arm64-motor från `binaries.prisma.sh`, blockerat nätverk). Grep-verifierat att ingen annan `route.ts`-fil i projektet exporterar något utöver giltiga HTTP-metoder/config-fält.
- [ ] **Kvarstår:** `git push`, och **bekräfta i Vercel-dashboarden att deployen blir grön** – detta är den enda verifieringen som faktiskt räknas, se lärdom nedan.

**Lärdom:** `tsc --noEmit` fångar inte allt `next build` fångar. Efter det här bör Vercel-dashboarden (eller `list_deployments`/`get_deployment_build_logs` via Vercel-MCP:n) kollas efter varje push som en del av verifieringssteget, inte bara `tsc`.

## 17. EU-marknadsundersökning + "Ideas & voting"-sektion (2026-07-28, natt)

Beställning: gå igenom Best4Family-analysen, göra en bredare EU-marknadsundersökning, hitta vad familjer efterfrågar, jämföra mot vad vi har, hitta USP:ar/quick-wins inför användartester, och bygga en egen sektion för förbättringsförslag/nya funktioner med röstning.

- [x] **Marknadsundersökning genomförd** – `MARKET_RESEARCH_EU.md`, ny fil. Täcker Cozi, Tribe Family, FamilyWall, OurHome, Family Folder, TimeTree, Any.do Family, OurFamilyWizard, Life360, samt branschgemensamma mönster (smal scope vinner, EU-hosting som köpskäl, gamifiering fungerar för yngre barn, publika röstningssidor är standard).
- [x] **USP-/prioriteringssammanställning** tillagd i `ROADMAP.md` (ny sektion "USP:ar och prioritet inför användartester") – kopplar marknadsfynden till konkreta, redan identifierade att-göra-punkter istället för att skapa en ny, parallell lista.
- [x] **Avstämning med Mikael** om omfattning för röstningssektionen (se `AskUserQuestion` i sessionen): global över alla kunder (inte hushålls-scopad), kräver inloggning.
- [x] **Byggt:** ny sida `/dashboard/suggestions`, länkad från hamburgermenyn ("💡 Ideas & voting"). Se `PRODUCT_SPEC.md` 4b.18 för full teknisk beskrivning.
  - Nya Prisma-modeller `Suggestion`/`SuggestionVote` + enums `SuggestionCategory`/`SuggestionStatus` i `schema.prisma`.
  - `GET/POST /api/suggestions`, `PATCH/DELETE /api/suggestions/[id]`, `POST /api/suggestions/[id]/vote`.
  - Kategorier (Improvement/New feature), admin-styrt statusflöde, en röst per person och förslag (togglingsbar), författaren röstar automatiskt på sitt eget förslag.
- [x] `tsc --noEmit` kört – rent förutom de förväntade "Property 'suggestion' does not exist on PrismaClient"-felen (12 st, alla i de tre nya API-filerna), som är en direkt konsekvens av att sandboxen inte kan köra `npx prisma generate` mot den nya schemat (samma kända nätverksbegränsning som `binaries.prisma.sh` i punkt 4k/4l) — inte en kodbugg.
- [ ] **Kräver `npx prisma generate && npx prisma db push` lokalt** innan funktionen fungerar i produktion (nya tabeller, additiv migrering, ingen påverkan på befintlig data). Kör i samma veva som andra väntande db-ändringar om det finns några kvar.
- [ ] **Klicktesta efter deploy:** posta ett förslag, rösta/av-rösta på ett förslag från ett annat konto, verifiera att admin (din inloggning) kan ändra status men ingen annan kan, verifiera att "Remove" bara syns på egna Open-förslag.
- [ ] **Inte gjort:** publik/utloggad åtkomst (beslutat bort, kräver inloggning i v1), integration med bottenmenyn (ligger bara i hamburgermenyn för nu, matchar hur Family/Settings/Admin redan hanteras).
- **Commit blockerad denna gång:** `git add` gick igenom, men `.git/index.lock` kunde inte tas bort (varken av `git commit` självt eller ett manuellt `rm`, som gav "Operation not permitted" — samma kända sandbox-filsystembegränsning som i punkt 4k). Filerna ligger ändrade direkt i din mapp som vanligt (Read/Write/Edit går rakt mot din riktiga projektmapp, inte en kopia) — bara `git commit`/`git push` kräver att du gör det själv den här gången. Kör `rm .git/index.lock` följt av `git add -A && git commit -m "..." && git push` lokalt.

## 18. Training, School, utgående kalendersynk (2026-07-28, natt, uppföljning på punkt 17)

Direkt uppföljning efter genomgången av marknadsundersökningen: Mikael bekräftade ICS-riktningen för klubb-/skolkalendrar, men ville också (1) synka ut till sin egen privata Google/Outlook-kalender, (2) kunna lägga upp Training som en vanlig återkommande bokning tilldelad ett barn (t.ex. "Karate, tisdagar"), inte bara importera den. Full teknisk beskrivning i `PRODUCT_SPEC.md` 4b.19.

- [x] **Schema:** `TRAINING`/`SCHOOL` tillagda i `ReminderCategory`-enumen, `User.calendarFeedToken` (nullable, unik) tillagd.
- [x] **`/api/family/chores` generaliserad** – `GET`/`POST` stödjer nu `category=CHORE|TRAINING` (default CHORE). `requiresApproval` tvingas alltid `false` för TRAINING (inget godkännande-koncept för en bokning).
- [x] **`dashboard/family/new/page.tsx`** – Chore/Training-toggle, dynamiska etiketter/mallar/knapptext, döljer godkännande-togglen för Training, sparar till `/dashboard/calendar` istället för `/dashboard/family` efter en Training.
- [x] **`dashboard/family/page.tsx`** – ny "⚽ Add training"-knapp.
- [x] **School — rättad till egen sektion efter direkt korrigering från Mikael:** *"NEj school borde vara ett eget avsnitt. Missuppfattning. ... som barn vill jag ju kunna lägga upp mina prov ... följa själv. Så när jag som barn loggar in så ska jag bara se det jag har rätt till."* Första versionen (School som kategori i vanliga Reminders-flödet) reverterades helt: `dashboard/new/page.tsx`, `dashboard/page.tsx`, `dashboard/[id]/page.tsx`, `dashboard/[id]/edit/page.tsx`, `api/reminders/route.ts` + `[id]/route.ts`, `lib/email.ts` har alla fått SCHOOL-referenser borttagna igen.
- [x] **`/api/family/chores` utökad ytterligare** – `BOOKING_CATEGORIES` innehåller nu `CHORE|TRAINING|SCHOOL`. Samma `isChild`-filter som redan skyddade Chores/Training (`whereFilter.assignedTo = session.user.id` när `role === "CHILD"`) gäller nu automatiskt även School — **inget barn kan se ett annat barns skoluppgifter**, noll extra kod krävdes.
- [x] **Barnens självbetjäning (`dashboard/family/child/page.tsx`)** – ny egen "📚 School"-sektion (separat kort/lista, inte blandad med Chores), eget "+ Add a test or homework"-formulär (namn, valfritt datum, valfri anteckning) och en radera-knapp (×) per item.
- [x] **Föräldravy, ny sida `/dashboard/school`** – listar alla barns skoluppgifter grupperade per barn (samma endpoint returnerar hela hushållet till en vuxen, med `assignedUser` ifyllt), eget formulär (välj barn + namn + datum + anteckning). Länkad från hamburgermenyn ("📚 School", mellan Chores och Family).
- [x] **`dashboard/calendar/page.tsx`** – hämtar nu trainings OCH school-items separat, nya färger (Training koral `#D85A30`, School indigo `#3730A3`, matchar mockupen som visades i chatten). Klick på ett School-item länkar till `/dashboard/school`.
- [x] **ICS-utflödet uppdaterat** – `who`-etiketten (barnets namn i kalenderbeskrivningen) gäller nu CHORE/TRAINING/SCHOOL, inte bara CHORE/TRAINING.
- [x] `tsc --noEmit` kört efter alla ändringar. Rent förutom de förväntade "Prisma-client inte regenererad ännu"-felen (samma mönster som punkt 17 — `calendarFeedToken`/`TRAINING`/`SCHOOL`/`suggestion(Vote)` finns inte i den lokalt cachade Prisma-klienten förrän `prisma generate` körs mot det nya schemat). Två genuina TS-fel hittades och fixades i den nya `/dashboard/school/page.tsx` (Map-iteration krävde `Array.from(...)`, saknade typannoteringar på sort-callbacken).
- **Sidofynd, inte orsakat av dagens arbete:** `tsc` flaggar ett förbefintligt typfel i `api/reminders/[id]/route.ts` (PATCH, `householdId`-hanteringen runt rad 108) – verifierat med `git diff` att den enda ändringen i den filen är kategori-enumen, så felet fanns redan innan. Inte akut, inte fixat.
- [x] **`npx prisma generate && npx prisma db push` körda lokalt, deploy klar och verifierad i Vercel** (2026-07-28) – Mikael bekräftade "ser ok ut i vercel". `.git/index.lock`-blockeringen löstes genom att hitta och radera två andra kvarvarande lock-filer (`.git/HEAD.lock`, `.git/objects/maintenance.lock`), inte bara `index.lock` självt.
- [ ] **Inte byggt än:** inkommande prenumeration på en extern klubb-/skol-.ics-länk per barn. Kräver server-side hämtning (CORS) + en ny modell (`CalendarSubscription` eller liknande) + periodisk uppdatering. Nästa steg, egen omgång — se `ROADMAP.md`.
- [ ] **Klicktesta i produktion:** Training-bokning → syns i kalendern (koral). Lägg till ett School-item som förälder på `/dashboard/school` OCH som barn i Family → child view → School-sektionen, verifiera att ett barn bara ser sina egna (logga in som två olika barn om möjligt), hämta kalenderlänken i Profile och prenumerera från en riktig Google/Outlook/Apple-kalender, "Generate a new link" och verifiera att den gamla länken slutar fungera. Inte gjort ännu — koden är deployad men inte klickad igenom skarpt.

## 14. Kalendervy – fjärde bottenmeny-flik (2026-07-28)

Beställning: en kalender baserad på datan vi redan har (reminders + sysslors datum), som en fjärde flik bredvid Reminders/Shopping list/Wishlist. Extern synk (Google/Apple) medvetet uteslutet – det är nästa steg, inte den här.

- [x] `src/lib/recurrence.ts` – ny, ren funktion `getOccurrencesInRange(item, from, to)`. Expanderar ett `Reminder`s lagrade `date` + `recurrence` (ONCE/DAILY/WEEKLY/MONTHLY/YEARLY) till alla förekomster inom ett datumintervall. Sysslors `choreRecurrenceDays` (t.ex. "1,2,3,4,5" = mån–fre) tar över helt när den är satt, oavsett `recurrence`-värde. Hanterar MONTHLY/YEARLY-clamping (t.ex. 31:a i april → sista dagen i april).
- [x] `src/app/dashboard/calendar/page.tsx` – ny sida. Hämtar `/api/reminders` (rena reminders) + `/api/family/chores` (sysslor, redan Pro/trial-gated och roll-filtrerad av befintlig endpoint) parallellt, expanderar bara för det synliga 6-veckors griden (obegränsat hur långt fram/bak man bläddrar, ingen risk för orimligt stora listor). Månadsnavigering, "Today"-knapp, klick på dag visar dagens poster, klick på en reminder-post går till `/dashboard/[id]`, klick på en syssla går till `/dashboard/family` (ingen egen sysslo-detaljsida finns – medvetet, inte byggd i denna omgång). Barnprofiler omdirigeras till `/dashboard/family/child`, samma mönster som huvuddashboarden.
- [x] `BottomNav.tsx` – Calendar tillagd som fjärde flik. Reminders-flikens match-funktion uppdaterad så den inte längre "äter" `/dashboard/calendar`-routen.
- [x] `tsc --noEmit` kört rent (en TS2802-iterator-bugg och två implicit-`any`-fel fixade under vägen – `Map.values()` behövde `Array.from(...)` för det målade TS-target).
- [x] Committat (`0a3032e`).
- [ ] **Kvarstår:** `git push` (sandboxen kan committa men inte pusha, samma begränsning som tidigare, se punkt 13), bekräfta grön Vercel-deploy, och alla klicktester i `TEST_VERIFICATION.md` §0.

**Medvetna avgränsningar för denna omgång:** ingen egen detaljsida för sysslor från kalendern (går till Family-hubben istället), ingen "skapa/redigera direkt i kalendern"-interaktion (bara visning + navigering till befintliga formulär), ingen extern kalendersynk. Se `ROADMAP.md` Fas 3 för nästa steg.

## 15. Kalender-förbättringar + bottenmeny-omdesign (2026-07-28, beställt – inget byggt än)

Feedback direkt efter första kalenderversionen (punkt 14): griden känns "tråkig" som enda vy. Fyra separata önskemål, ingen av dem byggd – loggat för nästa runda.

- [ ] **Agenda-vy under griden:** istället för (eller som komplement till) dagens "klicka en dag → se den dagens poster"-panel, visa hela innevarande månadens aktiviteter som en löpande lista grupperad per dag, med dagens datum som startpunkt/fokus (t.ex. auto-scrollad dit, eller tydligt markerad). Griden överst blir då mer en navigering/översikt, agenda-listan under gör kalendern faktiskt användbar utan att klicka runt.
- [ ] **"+"-knapp högst upp i kalendern** för att lägga till direkt därifrån, istället för att behöva gå till Reminders-fliken → New. **Öppen fråga att lösa innan bygge:** ska den fråga "Reminder eller Chore?" (två olika underliggande flöden idag) eller alltid skapa en vanlig reminder? Behöver ett beslut, inte bara "bygg det".
- [ ] **Bottenmeny-omstrukturering:** Calendar ska flyttas till **mittenpositionen** i bottenmenyn. Sista knappen (längst till höger) ska bli en **"All functions"-flik** som samlar det som inte får plats i de synliga positionerna – i praktiken en ersättning/utökning av dagens hamburgermeny, fast som en bottenmeny-flik istället för en meny i sidhuvudet.
- [ ] **Admin-inställning: valbara kategorier i bottenmenyn.** Under Admin ska (troligen OWNER/PARENT, samma mönster som andra admin-inställningar) kunna välja vilka funktioner/kategorier som ligger i de kvarvarande synliga bottenmeny-slotsen (utöver Calendar i mitten och "All functions" sist, som är fasta). **Öppna frågor att lösa innan bygge:** hur många totala slots ska bottenmenyn ha (idag 4: Reminders/Shopping list/Wishlist/Calendar)? Är "kategorier" detsamma som dagens tre flikar (Reminders/Shopping list/Wishlist), eller något bredare (t.ex. även Family/Sysslor som egen flik)? Gäller valet per hushåll eller per person? Detta är en informationsarkitektur-förändring, inte bara en UI-justering – förtjänar en kort spec-runda med dig innan kodning, samma resonemang som "Föräldrautrymme" i `ROADMAP.md`.

## 16. Admin-godkännande av nya konton (2026-07-28, natt) + startsidans två CTA-knappar

Direkt beställning: "vi testar och bygger nytt så vi vill hålla det kontrollerat" – nya konton ska inte kunna logga in förrän admin (du) godkänner dem.

- [x] **Schema:** `User.approved` (`Boolean @default(true)`) + `User.approvedAt` (`DateTime?`). Default `true` är medvetet – det backfyller alla *befintliga* konton som redan godkända, ingen blir utelåst retroaktivt. Nya toppnivå-signups sätter explicit `approved: false` vid skapandet, se nedan.
- [x] **E-post/lösenord-registrering** (`/api/auth/register`): skapar kontot med `approved: false` (utom om email matchar `ADMIN_EMAIL` – bootstrap så du aldrig kan låsa ut dig själv). Ingen auto-inloggning längre efter registrering (försökte tidigare logga in direkt, vilket nu ändå skulle nekas) – istället en ny bekräftelseskärm: "Account created — pending approval".
- [x] **Google-inloggning** (`auth.ts`, `signIn`-callbacken): samma sak för ett helt nytt Google-konto – skapas med `approved: false` (utom `ADMIN_EMAIL`), blockeras och skickas till `/login?error=PendingApproval` istället för att få en session.
- [x] **Inloggning blockerad tills godkänd:** både `credentials`- och `pin`-providern i `auth.ts` kastar ett specifikt felmeddelande (`"Your account is pending admin approval."`) om `user.approved` är `false`. `/login` och familje-PIN-skärmen (`/family`) visar nu det specifika meddelandet istället för sitt generiska "fel lösenord/PIN"-fallback, men bara för exakt det meddelandet – allt annat visar fortfarande den generiska texten (ingen extra information läcker om ett konto finns eller inte).
- [x] **E-post (tre nya, i `lib/email.ts`):** `sendPendingApprovalEmail` (till den nya användaren, "vi granskar din ansökan"), `sendAdminApprovalRequestEmail` (till dig, med länk till `/admin`), `sendAccountApprovedEmail` (till användaren när du godkänner). Alla best-effort (fel loggas, blockerar inte flödet).
- [x] **Admin-UI** (`/admin`): ny flik "Pending approval (N)" bredvid Families/Users without family, gulmarkerad i flikraden och som en femte stat-ruta överst när N > 0. Varje rad har **Approve** (`PATCH /api/admin/users/[id]` med `{action:"approve"}`, sätter `approved:true` + `approvedAt`, skickar godkännande-mailet) och **Reject** (återanvänder befintlig `DELETE`-radering).
- [ ] **Medveten avgränsning:** barnprofiler (skapade via `/api/family/child-profiles` av en redan godkänd förälder) och hushållsinbjudningar som accepteras av en redan existerande, godkänd användare påverkas **inte** av detta – bara helt nya toppnivå-konton (e-post/lösenord-registrering eller första Google-inloggning) gated. Detta var mitt eget beslut för att inte blockera barn/familjemedlemmar som redan är en del av en godkänd familj – säg till om du vill att det ska gälla bredare (t.ex. även nya konton som går med via en hushållsinbjudan).
- [ ] **Kräver `npx prisma generate && npx prisma db push`** innan det fungerar i produktion – se punkt 6. Kunde inte köra `prisma generate` i sandboxen den här gången (403 mot `binaries.prisma.sh`), så `tsc --noEmit` gick inte att verifiera rent – kodgranskad manuellt (brace-balans kontrollerad i alla ändrade filer), kör ett riktigt `tsc --noEmit` lokalt efter `prisma generate` för att vara säker.
- [ ] **Inte byggt:** ingen batch-approve, inget filter/sök specifikt inom pending-fliken utöver den delade sökrutan (funkar dock, samma `usersFiltered`).
- [ ] Klicktesta – se ny rad i punkt 7.
- [ ] **Inte committat av mig:** `git add` lämnade kvar en `.git/index.lock` som sandboxen inte fick lov att ta bort (samma gamla filsystembegränsning som punkt 1), vilket blockerade `git commit`. Filen ligger i din riktiga projektmapp (samma mount) – **ta bort `.git/index.lock` för hand** (Finder eller `rm .git/index.lock` i Terminal) innan du kör `git add`/`commit`/`push` själv. Alla filändringar ovan är redan skrivna till disk oavsett, bara inte committade än.

**Om startsidans två knappar ("Get started free" / "See how it works") – löst (2026-07-28, natt):** kollade koden (`app/page.tsx`) och hämtade den skarpa sidan (`www.assistiq.se`) – de gick faktiskt till olika sidor (`/register` respektive `/login`), inte samma URL, men `/login` visade inget om hur appen funkar, så det kändes som samma ställe. Mikael valde: en riktig säljsida med features + Free/Pro-jämförelse, med "Create account"/"Log in" längst ner.

- [x] **Ny sida `/features` byggd.** Tre delar: (1) "What's included for everyone" – de sex free-funktionerna (reminders, email-påminnelser, kategorier, hushållsdelning, kalender, PWA), grundat på vad som faktiskt *inte* är `is_pro`/trial-spärrat i koden idag (se `PRODUCT_SPEC.md` 4b.6/4b.8/4b.9 – bara Sysslor/Shopping/Wishlist och det som återanvänder samma endpoint (Training/School) är spärrat). (2) "Family plan" – de sju Pro-funktionerna (shopping list, wishlist, chores, training, school, broadcasts, utgående kalendersynk), märkt "7-day free trial, then Pro" – matchar den befintliga trial-mekaniken i `dashboard/family`. (3) En Free vs. Pro-jämförelsetabell + en rad som är ärlig om att **priset inte är satt än** (ingen Stripe-integration finns, se `PRODUCT_SPEC.md` 4b.6) – hittade inte på ett pris.
- [x] `app/page.tsx`: "See how it works"-knappen pekar nu på `/features` istället för `/login`.
- [ ] Klicktesta: öppna `/features`, kolla att layouten ser bra ut på mobil och i Web view, testa båda knapparna längst ner.

## 19. Stor UX-genomgång: bottenmeny, kalender, inköpslista, sysslor/skola/träning, inställningar (2026-07-28, beställt – inget byggt än)

Mikael gick igenom hela appen och skrev en lång rad kommentarer i ett svep. Nedan är varje punkt genomgången mot faktisk kod (inte antagen) och sorterad in under rätt del av appen, med nuläge, konflikter mot tidigare beslut och öppna frågor markerade. **Inget kodat än** – det här är research + sammanställning, redo att prioriteras in i körordningen (punkt 12) eller byggas direkt, ditt val.

### 19a. Anpassningsbar bottenmeny + hamburgermeny som fullständig åtkomst
- **Nuläge:** `BottomNav.tsx` har 4 hårdkodade flikar (Reminders, Shopping list, Wishlist, Calendar), ingen anpassning möjlig. Calendar ligger sist, inte först.
- **Ny beställning:** Calendar längst till vänster, **enda fliken som inte går att ta bort**. Övriga flikar väljs **per person** under profilen (inte en hushålls-admin-inställning). Default: Calendar, Reminders, Shopping list, School. 4 eller 5 flikar totalt.
- Hamburgermenyn ska **alltid** innehålla alla funktioner oavsett vad som ligger i bottenmenyn. Nuläge (`HamburgerMenu.tsx`): saknar länkar till Shopping list, Wishlist, Calendar, Training – bara Reminders/Chores/School/Family/Ideas & voting/Settings/Admin finns idag.
- **Konflikt med punkt 15** (loggad 2026-07-28, inget byggt): den föreslog Calendar i **mitten** + en sista "All functions"-flik som ersättning för hamburgermenyn, plus en admin-styrd (hushålls-nivå) inställning. Den här beställningen **ersätter** de öppna frågorna i punkt 15: Calendar till vänster (inte mitten), ingen separat "All functions"-flik behövs (hamburgermenyn täcker redan det), val sker per person (inte admin/hushåll). Säg till om du vill ha kvar något av det gamla ändå.
- **Kräver:** nytt fält för "vilka flikar denna person valt" (t.ex. en sträng-array på `User`), ny UI i Profile för att välja 4–5 av de tillgängliga apparna, `BottomNav.tsx` görs datadriven istället för den fasta `TABS`-arrayen.

### 19b. Kalender
- **Månadsöversiktslista under dagsvyn:** samma önskemål som redan loggades i punkt 15 ("Agenda-vy under griden") – bekräftat igen här. Idag visar `dashboard/calendar/page.tsx` bara den valda dagens poster under griden, ingen löpande månadslista.
- **Filtrera på typ + synlig färgkodning högst upp:** färgerna finns redan per typ (`CATEGORY_COLOR`/`CHORE_COLOR`/`TRAINING_COLOR`/`SCHOOL_COLOR`), men ingen legend och ingen filtrering. Ny UI: klickbara typ-chips högst upp, av/på per typ.
- **Flytande "+"-knapp som på Reminders-sidan:** löser punkt 15:s öppna fråga ("Reminder eller Chore?") – **svar: välj typ först, sedan datum, sedan detaljer** (en liten guidad flöde, inte ett stort formulär direkt).

### 19c. Inköpslista
- **Dölj delningslänken** (dela-ikonen + "🔗 Shared with a link"-bannern i `dashboard/family/shopping-list/page.tsx`): **detta är en omsvängning** – funktionen byggdes medvetet i punkt 4i och klicktestades skarpt 2026-07-27. Ny instruktion: vi vill inte kunna dela listan så, göm den (token-infrastrukturen kan ligga kvar orörd i botten).
- **Listan tillgänglig för hela familjen ELLER per-lista väljer vem som ser den:** **redan byggt** – `ListAccessPanel`/`ListMember` finns (punkt 4l). Inget nytt att koda, bara klicktesta att det matchar vad du vill ha.
- **"Add an item"-rutan tar för mycket plats:** byt till en "+"-knapp som öppnar val mellan **Recent / Categories / Create new**, istället för det ständigt synliga formuläret (namn, kvantitet, anteckning, länk, bild). Recent-chips och kategori-katalogen finns redan (4i) – det här är en ombyggnad av entry-pointen, inte ny data.
- **Infogat 2026-07-28 (beslutat: bygg in i samma omgång, inte separat):** tre punkter som redan låg i `ROADMAP.md` (Fas 2 / "Produktriktning – nästa runda") men aldrig byggts, naturliga att lägga till samtidigt som entry-pointen ändå byggs om:
  - **Streckkodsskanning:** femte valet i "+"-menyn (utöver Recent/Categories/Create new) – webbläsarens `BarcodeDetector`-API (gratis) med `@zxing/browser` som fallback, uppslag mot Open Food Facts (gratis, ingen nyckel) för namn/kategori. Kräver test på en riktig telefon (kameraåtkomst går inte att verifiera i sandboxen).
  - **Receptimport via foto:** Tesseract.js (gratis, körs i webbläsaren) läser av text i en bild, enkel regelbaserad tolkning ("2 dl mjölk", "3 ägg") lägger till rader på listan. Kvaliteten är märkbart sämre än betalda molntjänster – kommunicera det, inte en dold begränsning.
  - **Butiksläge:** fullskärmsvy för användning i affären (stor text, en-handsvänlig) – egen knapp/vy på samma sida.

### 19d. Sysslor/Chores + barnhantering
- **Chores känns inte som en egen sektion:** `dashboard/family/page.tsx` är i praktiken sysslo-sidan men har titeln/rollen "Family". Föreslår: gör om till en riktig egen Chores-sida, separat från Family-konceptet.
- **Ta bort barnens inloggningslänk** (`<ShareLink>` högst upp på sidan) – ska hanteras från Family-admin istället, där man lägger till/flyttar in medlemmar.
- **"Done over time" saknar "this year":** idag bara Last 7 days / This month / Last month (`ChildStats`, `/api/family/stats`). Lägg till `thisYear`.
- **"Add chore"-knappen ser annorlunda ut:** idag en pill-knapp med text, ska bli samma flytande runda "+"-knapp som Reminders/Calendar.
- **Training, Shopping list och Add child ligger på samma sida idag** (rad ~516–555 i `dashboard/family/page.tsx`): Training ska vara en helt egen sektion (som School), Add child ska hanteras under admin, Shopping list-genvägen härifrån tas bort helt (finns redan i bottenmeny/hamburgermeny).
- **Infogat 2026-07-28 (beslutat: bygg in i samma omgång):** **Belöningar kopplat till godkända Sysslor** – redan flaggad i `ROADMAP.md` (Fas 2, Best4Family-analysen) men aldrig byggd. Utökning av befintlig `ChoreStatus`-godkännandeflow (APPROVED-status finns redan) – naturligt att lägga till samtidigt som Chores-sidan ändå byggs om till egen sektion. **Öppen fråga att lösa innan kodning:** poäng/stjärnor per godkänd syssla, eller kopplat till riktiga belöningar (fickpengar, en aktivitet)? Behöver ett snabbt beslut från dig innan bygget, inte bara "bygg det".

### 19e. School & Training – "alla aktiviteter tillhör någon"
- **Redan till stor del byggt:** både School (`dashboard/school`) och Training kräver redan val av barn/`assignedUser` vid skapande, och kalendern grupperar redan på `who`. Kvarstår: verifiera att det verkligen är **obligatoriskt** (inte bara ett förval) i båda formulären – kolla vid klicktest.

### 19f. Hamburgermeny – ta bort Family
- Eftersom Chores (19d) och Training blir egna sektioner ska "Family"-länken tas bort ur hamburgermenyn – den pekar idag på **exakt samma sida** som "Chores"-länken (`HamburgerMenu.tsx` rad 65 & 67, båda `/dashboard/family`).

### 19g. Inställningar – familjemedlemmar, Google-koppling, kontosammanslagning

**Beslut tagna med Mikael 2026-07-28 (genomgång via frågor, inget byggt än):**

- **Multi-family-scope:** *"Bara förbered datamodellen."* Ingen växlare/UI byggs nu. Men modellen måste vara redo för att en person kan tillhöra 2 familjer samtidigt (separerade föräldrar-scenariot) – det ska **inte** bli stort jobb att slå på senare, men får inte byggas bort av misstag nu. Konkreta krav för den *senare* omgången, antecknade här så de inte glöms:
  - När en person tillhör 2 familjer ska hen **tvingas välja vilken familj** varje ny post (reminder/syssla/skola/etc.) hör till, vid varje skapande – inget "delat som standard".
  - **Ingen bulk-migrering** av gamla poster om någon kopplas till familj nummer två – vill man flytta en gammal post får man gå in och ändra den för hand, en och en.
  - Schema-konsekvens att hålla koll på **redan nu**: inga nya hårda `@@unique`-constraints eller endpoints som antar exakt en household per user får läggas till framöver (håll dörren öppen), men själva växlar-UI:t/logiken byggs inte förrän det blir en egen beställning.
- **Kontosammanslagning (Google + lösenord, samma mail) – scope för nu:** *"Bara flytta allt"* – inte delning-per-typ (den kräver den fulla multi-family-växlaren ovan, som medvetet väntar). Så: sammanslagningsflödet i den här omgången erbjuder ett enda utfall – flytta allt till en vald familj. "Dela aktiviteter per typ mellan familj A och B" är en **uppföljningsfunktion**, byggs när/om den fulla multi-family-växlaren byggs.
- **Trigger + bekräftelse:** automatisk upptäckt vid Google-inloggning (mailet matchar redan ett lösenordskonto) **+ en bekräftelseskärm innan något faktiskt slås ihop** – ingen tyst/direkt sammanslagning.
- **Lägga till familjemedlemmar under Settings:** delvis redan byggt – `profile/page.tsx` har "Invite a member" (`/api/household/invite`). Om personen redan finns i systemet ska den kunna bjudas in direkt – ny logik.
- **Lägga upp e-post, sedan själv koppla till Google i efterhand:** ny funktion, finns inte idag (idag väljer man Google ELLER lösenord vid registrering, ingen efterhandskoppling).

### 19h. Training – inkommande ICS-import + synlighetsval
- **Importera ICS-kalender per person för Training:** motsatsen till vad som redan finns – idag finns bara **utgående** ICS (punkt 18, `User.calendarFeedToken`, appen exporterar TILL Google/Outlook/Apple). Detta är **inkommande** import (prenumerera på en extern .ics-länk, t.ex. en idrottsklubb). Redan flaggat som ej byggt i punkt 18: *"Kräver server-side hämtning (CORS) + en ny modell (CalendarSubscription) + periodisk uppdatering."* Bekräftat igen här.
- **Välja om alla eller bara vissa ser den kalendern:** samma åtkomstmönster som 19a/19c – `ListMember`-modellen kan sannolikt återanvändas för kalenderprenumerationer.

**Nästa steg:** de två stora beslutspunkterna (multi-family-scope, kontosammanslagning) är avgjorda, se 19g ovan. Övriga punkter (19a–19f, 19h) har inga öppna beslut kvar – redo att plugga in i körordningen (punkt 12) och byggas. Säg till när du vill sätta prioritetsordning eller köra igång.

## 20. Byggomgång på hela punkt 19 (2026-07-28, efter "kör")

Byggde igenom nästan hela punkt 19 i en lång sammanhängande omgång. `tsc --noEmit` kört rent efter varje deljobb (utom de två kända, väntade Prisma-felen på `bottomNavTabs`, se nedan). Inget pushat än – ligger i din riktiga projektmapp, klart för `git add && git commit && git push` när du vill.

**19f – Hamburgermeny (klar):** dubblett-länken "Family" borttagen. Nu länkar menyn till allt: Reminders, Calendar, Shopping list, Wishlist, Chores, Training, School, Ideas & voting, Settings, (Admin).

**19c – Delningslänk dold (klar):** dela-ikonen och "🔗 Shared with a link"-bannern borttagna ur `dashboard/family/shopping-list/page.tsx`. Token-infran (`shareList`/`turnOffShare`, API-endpoints) rörd inte alls — bara UI:t gömt, precis som beställt.

**19d – "This year" + flytande "+"-knapp (klar):** `/api/family/stats` har nu ett fjärde fönster (`thisYear`, från 1 jan UTC), "Done over time"-kortet är en 2×2-grid istället för 3 kolumner. "Add chore" är nu samma flytande runda "+"-knapp som Reminders/Calendar (position fixed, höger 20/botten 84) istället för en pill-knapp.

**19d – Chores-sidan städad (klar):** barnens inloggningslänk (`<ShareLink>`) borttagen. "Add child" fanns redan fullt utbyggt i Profile (Settings → "+ Add child", med redigering) sedan wishlist-fixet — behövde alltså inte byggas, bara tas bort härifrån. Shopping list-genvägen borttagen (finns i bottenmeny/hamburgermeny).

**19d – Training egen sektion (klar):** ny sida `/dashboard/training`, mirror av `/dashboard/school`-mönstret — listar alla barns träningar grupperade per barn, med schema formaterat från `choreRecurrenceDays`/`recurrence`. "Add training"-genvägen borttagen från Chores-sidan. Kalenderns klick-igenom och formulärets redirect efter spara pekar nu på `/dashboard/training` istället för `/dashboard/family`/`/dashboard/calendar`.

**19e – Verifierat, inget att bygga (klar):** `/api/family/chores` POST tvingar redan `assignedTo` för vuxna (`"assignedTo required"` om det saknas) och self-assignar barn alltid till sig själva oavsett vad de skickar in — "alla aktiviteter tillhör någon" var redan garanterat på serversidan, för både School och Training.

**19b – Kalender (klar):** typfilter/färglegend högst upp (klickbara chips, av/på per typ — Reminders/Chores/Training/School), en ny "Everything this month"-lista under dagspanelen (grupperad per dag, respekterar filtret), och en flytande "+"-knapp med en 2-stegs guide (välj typ → välj datum) som sedan skickar dig vidare till rätt befintligt formulär med datumet ifyllt via `?date=`-parametern. `/dashboard/new`, `/dashboard/family/new` och `/dashboard/school` läser nu alla den parametern.

**19a – Anpassningsbar bottenmeny (klar, väntar på db push):** nytt fält `User.bottomNavTabs` (kommaseparerad lista, null = default). Calendar är hårdkodad som första och enda obligatoriska flik i `BottomNav.tsx` — resten (`reminders`/`shopping-list`/`wishlist`/`chores`/`training`/`school`) väljs i Profile → Preferences → "Bottom nav" (3–4 st, sparas direkt vid klick, samma mönster som web/mobile-växlaren). Default om inget valt: Reminders, Shopping list, School (+ Calendar = 4 totalt).

**19c – Add-item-ombyggnad + streckkod + butiksläge (klar, receptfoto medvetet inte byggt):**
- "Add an item"-formuläret är borttaget som ständigt synlig ruta. Ersatt av en flytande "+"-knapp som öppnar ett bottom-sheet med fyra flikar: **Recent** (samma chips som förut), **Categories** (samma katalog-browse som förut), **New** (det gamla formuläret, nu inuti sheeten), **Scan** (ny).
- **Streckkodsskanning byggd** med webbläsarens inbyggda `BarcodeDetector`-API (ingen ny npm-paket, ingen kostnad) — funkar i Chrome/Edge, känner av EAN-13/EAN-8/UPC-A/UPC-E, slår upp produktnamn mot Open Food Facts (gratis, ingen nyckel) och lägger till direkt. Snyggt fallback-meddelande om webbläsaren saknar stöd (Safari/Firefox).
- **Butiksläge byggd:** fullskärms, storstilad, en-handsvänlig vy — bockar av direkt i listan, "Done"-knapp för att gå ur.
- **Receptimport via foto (OCR) — medvetet INTE byggd den här omgången.** Kräver ett nytt npm-paket (Tesseract.js) som jag inte ville installera blint i sandboxen (skiljer sig från streckkodsskanningen, som bara använder webbläsarens inbyggda API — noll nya beroenden), och kan inte testas meningsfullt utan en riktig telefon och riktiga receptfoton. Nästa steg om du vill ha den: lägg till `tesseract.js` i `package.json`, kör `npm install` lokalt, sedan en egen kodrunda för själva OCR-tolkningen.

**19g – Inställningar (klar, med ett viktigt fynd):**
- **Fynd som ändrar scopet:** kontosammanslagningen är **redan till stor del byggd**, bara inte synlig som en egen "funktion". `auth.ts`s Google-inloggning slår redan upp befintlig `User` på email — om en person med lösenord loggar in via Google med samma mail, återanvänds samma konto (ingen dubblett skapas, Google blir bara ett extra sätt att logga in på). Och `autoJoinPendingInvite` (körs vid both Google- och lösenords-inloggning) gör redan exakt "flytta allt": `// Remove from any existing household` följt av att gå med i den nya. Det här **är** den "flytta allt"-varianten av sammanslagning vi bestämde i förra rundan — den fanns redan, byggd för ett annat syfte (hushållsinbjudningar).
- **Det som fortfarande saknas:** bekräftelseskärmen ("man ska få frågan") innan bytet sker — idag händer det tyst, direkt vid inloggning. **Medvetet inte byggd den här omgången:** att pausa mitt i NextAuths `signIn`-callback och vänta på ett användarsvar kräver en omdirigerings-baserad tvåstegsdans (logga in → bekräftelsesida → slutför bytet), och `auth.ts` är precis den fil som orsakat flest subtila buggar tidigare (PIN-redirect, Google-detection, admin-godkännande). Jag vill inte chansa på den blint utan att kunna testa ett riktigt Google-inloggningsflöde, vilket sandboxen inte kan göra. Rekommendation: en egen, fokuserad omgång med riktig klicktestning på `auth.ts`, inte en delfunktion i den här listan.
- **Litet, säkert genomfört:** `/api/household/invite` talar nu om för dig direkt om mailet redan har ett konto ("they already have an account. Accepting will move them out of their current household into yours") — ingen överraskning senare.
- **Self-service Google-koppling:** ingen ny knapp behövdes — att logga in med Google på ett konto som redan har samma email som ett lösenordskonto **kopplar redan ihop dem automatiskt** (se fyndet ovan). Redan löst, om än inte kommunicerat i UI:t. Om du vill ha en tydlig "Link your Google account"-knapp i Profile (ren UI-sockerbit ovanpå det som redan fungerar) är det litet och säkert att lägga till senare.

**19h – Inkommande ICS-import för Training — INTE byggd den här omgången.** Kräver en ny modell (`CalendarSubscription`), en server-side hämtning av en extern URL (CORS-frigjort eftersom det sker server-side, inte i webbläsaren), en enkel .ics/VEVENT-parser (ingen finns i kodbasen idag — den utgående kalendersynken bygger .ics-text, den läser aldrig in .ics), och ett cron-jobb för periodisk uppdatering (mönster finns redan i `/api/cron/send-reminders`, men kräver en till rad i Vercels cron-konfiguration). Genuint den mest tekniskt osäkra biten kvar — vill hellre göra den ordentligt i en egen omgång än pressa in den nu efter en redan lång sammanhängande session.

**17 (Belöningar) — fortfarande blockerad.** Väntar fortfarande på ditt svar: poäng/stjärnor, eller kopplat till riktiga belöningar (fickpengar/aktivitet)? Inget byggt förrän det är avgjort.

**Kräver innan produktion:**
- [x] `npx prisma generate && npx prisma db push` lokalt — kört av dig, gick igenom.
- [ ] `git add -A && git commit -m "..." && git push`, sedan bekräfta grön deploy i Vercel-dashboarden (samma rutin som punkt 13 lärde ut).
- [ ] Klicktesta skarpt — särskilt bottenmeny-anpassningen (Profile → Preferences → Bottom nav), streckkodsskanningen (kräver en riktig telefon/webbkamera, kan inte verifieras i sandboxen), kalenderns nya "+"-guide, och butiksläget.

## 21. Vercel-byggfel efter punkt 20 — `useSearchParams` utan Suspense (2026-07-28, hittad direkt efter "kör")

**Symptom:** deploy `dpl_BJPoQPFDv2iY46KDSWVNZCgjD7f3` (commit `c401efa`, "UX overhaul...") gick till **ERROR** i Vercel. `tsc --noEmit` hade gått igenom rent innan push — samma fälla som punkt 13, fast en ny variant.

**Orsak:** kalenderns nya "+"-guide (19b) skickar med `?date=` till `/dashboard/new` och `/dashboard/school`, så jag lade till `useSearchParams()` direkt i huvudkomponenten på båda sidorna. Next.js 14:s statiska prerender-steg (`next build`, inte `tsc`) kräver att varje komponent som läser `useSearchParams()` sitter inuti en `<Suspense>`-gräns, annars kraschar den sidans prerendering. Byggloggen pekade exakt ut de två sidorna:
```
⨯ useSearchParams() should be wrapped in a suspense boundary at page "/dashboard/new"
⨯ useSearchParams() should be wrapped in a suspense boundary at page "/dashboard/school"
Error: Command "npm run build" exited with 1
```
`/dashboard/family/new/page.tsx` har samma mönster (även den läser `?date=`/`?type=`) men flaggades **inte** i loggen — den hade redan (sedan tidigare) sin `useSearchParams()`-läsning i en egen inre komponent wrappad i `<Suspense>` i default-exporten, vilket är precis rätt mönster.

**Fix:** samma mönster kopierat till de två trasiga sidorna — brutit ut till en inre komponent (`NewReminderForm` respektive `SchoolPageInner`) och wrappat den i `<Suspense fallback={null}>` i default-exporten. Ingen annan logik ändrad.

**Verifiering:** `tsc --noEmit` rent (inga fel alls nu — dina lokala `prisma generate`/`db push` har redan synkat bort de tidigare väntade `bottomNavTabs`-felen också). Kunde **inte** köra ett fullständigt `next build` i sandboxen för att bekräfta prerenderingen rakt av — `prisma generate` (som `npm run build` kör först) blockeras av samma kända nätverksbegränsning (403 mot `binaries.prisma.sh`), och bakgrundsprocesser dör mellan sandbox-anrop innan `next build` hinner klart (56 sidor). Förlitar mig istället på att mönstret är identiskt kopierat från den variant som redan är bevisat fungerande i produktion (`family/new`). Verifiera gärna själv med ett lokalt `npm run build` innan/efter push om du vill vara helt säker.

**Lärdom (läggs till punkt 13:s lista):** `tsc --noEmit` fångar typfel, inte Next.js byggtidsregler som Suspense-kravet kring `useSearchParams()`. Nya sidor/komponenter som läser query-parametrar bör alltid wrappas i `<Suspense>` direkt, även om `tsc` är tyst.

**Nästa steg:** `git add -A && git commit -m "fix: wrap useSearchParams in Suspense on /dashboard/new and /dashboard/school" && git push`, sedan kolla Vercel-dashboarden för grönt.
