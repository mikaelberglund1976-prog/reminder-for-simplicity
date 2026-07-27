# Todo – Reminder for Simplicity
**Skapad:** 2026-07-26, efter granskning av kodbas + git-status vid flytt till ny dator.
**Uppdaterad:** 2026-07-27 (kväll) – hamburgermeny + admin-åtkomst byggd, alla md-filer (PRODUCT_SPEC, ROADMAP, BRAND, OPERATIONS, TODO) synkade mot nuläget. Sektionerna nedan är nu i kronologisk ordning (döpte om 4d0→4e osv, som tidigare låg fel i ordning).

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

## 5. Deploy-status – läs detta innan nästa gång du deployar
- **Automatisk deploy vid `git push` funkar inte just nu.** GitHub-webhooken till Vercel triggar inte längre (bekräftat: pushar efter commit `ad58f32` gav noll nya deployments i Vercel, trots att koden landade korrekt på GitHub). Försök att koppla om Git-integrationen via Vercel-dashboarden (Settings → Git → Disconnect/Connect) gav `Error: Project Link not found`.
- **Fungerande workaround:** `npx vercel --prod` från `app/`-mappen (efter `npx vercel login` + `npx vercel link` en gång, koppla till befintliga projektet `reminder-for-simplicity`). Deployar direkt till `www.assistiq.se`. Bekräftat fungerande 2026-07-27.
- **`npx vercel git connect` funkar inte heller** – `Error: No local Git repository found`, trots att `git` fungerar fint i samma mapp. Misstänker att mellanslagen i mappnamnet ("Reminder for simplicity") stör Vercel CLI:s git-detektion. Inte undersökt djupare – inte akut eftersom CLI-deploy funkar.
- [ ] **Åtgärda git-auto-deploy** när du har tid – felsök `vercel git connect` (testa t.ex. i en mapp utan mellanslag), eller acceptera `npx vercel --prod` som standardrutin permanent (redan uppdaterat i `OPERATIONS.md` §5).
- [x] `OPERATIONS.md` §5 korrigerad – sa tidigare felaktigt "push till main" (repot heter `master`, och triggern funkar inte just nu oavsett).

## 6. Tekniska skulder, inte akuta
- [ ] **Säkerhet:** `npm audit` visar att Next.js 14.2 har flera kända CVE:er (DoS, cache-poisoning, SSRF). Full fix kräver major-uppgradering till Next 16 – för stort/riskabelt utan regressionstestning. Prioritera som egen sprint innan skarp lansering med riktiga användare.
- [ ] Prisma flaggar 5.22.0 → 7.9.0 (major). Samma resonemang som ovan – låg prioritet så länge 5.22 fungerar.
- [x] ~~Kör `npx prisma generate && npx prisma db push`~~ **Klart 2026-07-27** – kört av Mikael lokalt, gick igenom rent.
- [ ] Kör `npm install` lokalt för att synka `node_modules` om det inte redan är gjort.
- **Städtips (inte akut):** sandboxen jag jobbar i kunde inte ta bort `.bak`-filer som skapades under en bulk-sök-och-ersätt (samma gamla filsystemsbegränsning). De ligger kvar i `app/src/**/*.bak` men är nu i `.gitignore` så de committas inte – kör `find . -name "*.bak" -delete` lokalt om du vill ha bort dem helt.

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

## 8. Nästa steg
- [ ] Bestäm om du vill fortsätta på Fas 1-resten (beta-inbjudningar) eller fortsätta bygga ut Familj/Pro-spåret.
