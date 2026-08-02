# App Store-lansering – vad krävs för Apple App Store & Google Play (2026-08-02)

**Metod:** Websökningar mot Apples och Googles egna aktuella riktlinjer (App Store Review Guidelines, Play Console-hjälp) plus tredjepartskällor för praktisk implementation, korsat mot vår faktiska kodbas (`app/`). Källor längst ner.
**Syfte:** svara konkret på "om jag skulle vilja lansera för Apple och Google, vad måste vi göra om" – inte en allmän guide, utan vad *just den här appen* (Next.js-webbapp, redan PWA-förberedd) faktiskt behöver.

---

## 1. Sammanfattning

De två plattformarna är **inte symmetriska**. Android/Google Play är en rimlig, relativt billig utökning av det ni redan har. Apple/iOS kräver **ny teknisk utveckling** – Apple tillåter inte att en webbplats bara paketeras i ett fönster.

**Den viktigaste enskilda upptäckten:** ni har redan en PWA-grund (manifest + service worker, se §2) som Google Play kan bygga vidare på nästan direkt. Apple avvisar dock i praktiken den typen av app (Guideline 4.2.2, "web clippings"). Att lansera på båda samtidigt är alltså inte "samma jobb x2" – det är ett litet jobb (Android) plus ett stort, separat utvecklingsprojekt (iOS).

---

## 2. Nuläget i vår kodbas (bättre grund än väntat)

- ✅ `public/manifest.json` finns redan – namn, ikoner **192×192 och 512×512 med `maskable`-stöd**, standalone-läge, tema/bakgrundsfärg. Precis vad Google Play kräver för ikonresurser.
- ✅ `public/sw.js` finns redan och är registrerad i `layout.tsx` – cachar app-skalet (`/`, `/dashboard`, `/login`, `/register`) för snabbare laddning och viss offline-funktion. Passerar troligen grundkraven för en PWA, men cachar inte faktisk data (reminders/listor) – bara sidskalet.
- ❌ Ingen `assetlinks.json` (Digital Asset Links) – krävs av Google Play för att verifiera att appen och webbplatsen ägs av samma part (TWA-kravet).
- ❌ Ingen native/hybrid-app-kod alls – varken Capacitor, React Native eller motsvarande. Det finns inget att skicka till Apple idag.
- ✅ Redan mobilanpassad, responsiv, med bottennavigering (4b.10) – bra utgångsläge oavsett väg.

---

## 3. Google Play – väg och checklista

**Väg:** Trusted Web Activity (TWA) via t.ex. Bubblewrap eller PWABuilder – paketerar er befintliga PWA i ett tunt Android-skal utan att skriva om appen. Rimlig ambition givet vad som redan finns.

**Kvarstår:**
- [ ] `assetlinks.json` i `/.well-known/` för domänverifiering.
- [ ] Kör en Lighthouse PWA-audit och verifiera poäng ≥80 (inte kört ännu, okänt nuläge).
- [ ] Bygg APK/AAB med Bubblewrap/PWABuilder, sätt upp Play Console.
- [ ] Fyll i **Data Safety-formuläret** ärligt – ni samlar in email, namn, ev. betaldata (när Stripe byggs), och **barns personuppgifter** (barnprofiler). Måste disclosure:as oavsett om appen räknas som "riktad till barn" eller inte.
- [ ] Riktig Privacy Policy måste vara klar och länkad (idag bara struktur, se `PRODUCT_SPEC.md` 4b.28 – 7 punkter kvar).
- [ ] Avgift: **$25, engångs registrering** (ingen årsavgift).

**Families-policy:** appen riktar sig till föräldrar som administrerar hushållet, inte till barn direkt – bedömning: troligen **inte** "Designed for Families"-krav. Men Data Safety-formuläret måste ändå deklarera att barns uppgifter samlas in.

---

## 4. Apple App Store – väg och checklista

**Hård spärr att känna till:** App Store Review Guideline **4.2.2 ("web clippings")** blockerar i praktiken rena PWA-/webview-wrappers som bara visar den befintliga webbplatsen – Apple kräver att appen är "app-like", inte en "repackaged website". Att bara peka en WebView mot `reminderforsimplicity.com` riskerar avslag.

**Rekommenderad väg:** ett hybrid-ramverk som **Capacitor** (bygger på samma React/Next-kod men ger riktig åtkomst till native-API:er) – kombinerat med minst någon genuin native-funktion för att inte klassas som repackaged website: riktiga push-notiser (idag bara email-påminnelser, se §4.6 i `PRODUCT_SPEC.md`), native kamera för streckkodsskanning (idag webbläsarens `BarcodeDetector`, som redan är känt att **inte fungera i Safari/iOS**, se 4b.27 – att lösa det med en native kamera-plugin löser alltså två problem samtidigt), eventuellt en hemskärmswidget. Detta är ett riktigt utvecklingsprojekt, inte en paketering.

**Två krav som blockerar inlämning oavsett teknisk väg:**
- [ ] **Kontoradering (Guideline 5.1.1(v)).** Obligatoriskt sedan 2022: appar med kontoskapande måste låta användaren initiera *permanent* radering i appen, inte bara inaktivering. **"Delete account"-knappen i Profile → Security är idag bara en UI-shell** (känt sedan `PRODUCT_SPEC.md` 4b.17) – måste vara en fungerande backend-radering innan appen kan lämnas in. Detta är alltså inte längre "bara" ett GDPR-önskemål, det är en hård Apple-blockerare.
- [ ] **Riktig Privacy Policy** klar och länkad (samma gap som Google Play ovan).

**Betalning – viktigt beslut innan Stripe byggs (Fas 3):**
- Om Pro-prenumerationen ska säljas *i appen* utanför EU krävs Apples egen In-App Purchase (15–30% avgift) för digitala prenumerationer – Stripe direkt är inte tillåtet där.
- **Inom EU (er primärmarknad, se `MARKET_RESEARCH_EU.md`)** tillåter Apple sedan DMA-anpassningen 2025/2026 en **"External Purchase Link Entitlement"** – man kan länka till en egen webshop/Stripe-checkout istället för Apples IAP, men måste ansöka om entitlementet och följa prisparitetsregeln (Guideline 3.1.3: priset i appen får inte vara högre än det externa priset).
- **Konsekvens:** betalflödet (Fas 3, §6–7 i `PRODUCT_SPEC.md`) bör beslutas *innan* Stripe-integrationen byggs – annars riskerar ni att bygga fel betalflöde för iOS.
- Avgift: **$99/år** (Apple Developer Program).

---

## 5. Barns data – COPPA, oavsett app store-kategori

Appen är inte en "kids-app" (föräldrar administrerar barnprofiler, barn marknadsförs inte till direkt) – bedömning: troligen inte Apples Kids Category eller Googles Designed for Families. **Men** eftersom ni ändå *vetande* samlar in barns personuppgifter (namn, email, PIN för barnprofiler) gäller amerikansk COPPA om appen finns tillgänglig i USA, oavsett kategori.

- COPPA:s uppdaterade regler (2025 års ändringar) trädde i kraft med efterlevnadsdeadline **22 april 2026** – redan passerad. Striktare krav på verifierat föräldrasamtycke och datalagringstid.
- Ni har redan ett öppet, obeslutat gap kring **minimiålder för barnprofiler och vem som samtycker** (`PRODUCT_SPEC.md` 4b.17, `TODO.md` punkt 9) – det här var tidigare "bör lösas innan bred lansering", men blir nu direkt kopplat till **app store-godkännande**, inte bara en policy-formalitet.

---

## 6. Ett billigare mellansteg, värt att nämna

Ni behöver **inte** gå via någon app store för att ge användare en app-liknande upplevelse redan idag – PWA-grunden (§2) betyder att användare redan kan "Lägg till på hemskärmen" på både Android och iOS Safari, med ikon och helskärmsläge, utan Apples/Googles granskningsprocess eller avgifter. Det är inte samma synlighet som en riktig store-listning (ingen sökbarhet i App Store/Play), men kan vara en billig väg att testa efterfrågan innan ni investerar i Capacitor-arbetet för iOS.

---

## 7. Rekommenderad väg framåt

Matchar er "smalt och vasst"-princip (`PRODUCT_SPEC.md` §3) – bygg inte båda samtidigt bara för att båda nämndes:

1. **Lös de två blockerarna som gäller oavsett plattform först:** riktig kontoradering (redan P1 i `TODO.md` punkt 9/12) och en komplett Privacy Policy (4b.28). Ingen app store-inlämning är möjlig utan dessa.
2. **Besluta betalmodellen för app-butiker innan Stripe byggs** (Fas 3) – annars byggs fel sak.
3. **Android/Google Play** – lågt jobb givet er befintliga PWA-grund. Rimlig första plattform.
4. **iOS/Apple** – kräver ett eget utvecklingsprojekt (Capacitor + minst en genuin native-funktion, t.ex. riktiga push-notiser eller native streckkodsskanning). Gör detta som en medveten, avgränsad satsning, inte i förbifarten.

Se `TODO.md` punkt 25 för nedbruten handlingslista.

---

## Källor

- [App Store Guideline 4.2 Minimum Functionality](https://www.technetexperts.com/guideline-4-2-minimum-functionality/)
- [App Store Review Guidelines: Will Your Webview App Be Rejected? – Mobiloud](https://www.mobiloud.com/blog/app-store-review-guidelines-webview-wrapper)
- [Can You Publish a PWA to the App Store and Google Play? 2026 – Mobiloud](https://www.mobiloud.com/blog/publishing-pwa-app-store)
- [Update on apps distributed in the European Union – Apple Developer](https://developer.apple.com/support/dma-and-apps-in-the-eu/)
- [Communication and promotion of offers on the App Store in the EU – Apple Developer](https://developer.apple.com/support/communication-and-promotion-of-offers-on-the-app-store-in-the-eu/)
- [Apple Alternative Payment Fees 2026 – Neon Commerce](https://www.neonpay.com/blog/apple-app-store-alternative-payment-fees-what-developers-pay-in-2026)
- [Account deletion within apps – Apple Developer](https://developer.apple.com/news/upcoming-requirements/?id=06302022b)
- [App Store Review Guideline 5.1.1(v) – Apple Developer Forums](https://developer.apple.com/forums/thread/693997)
- [Trusted Web Activity – Paweł Dymek](https://paweldymek.com/blog/trusted-web-activity/)
- [Preview: Google Play Families Policies – Play Console Help](https://support.google.com/googleplay/android-developer/answer/17122218)
- [Provide information for Google Play's Data safety section – Play Console Help](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Convert Your Next.js App to iOS & Android with Capacitor 8](https://capgo.app/blog/building-a-native-mobile-app-with-nextjs-and-capacitor/)
- [Apple Developer Fee 2026 – Magora](https://magora-systems.com/apple-developer-fee/)
- [How to Create a Google Play Developer Account 2026 – Afkar Software](https://afkarsoftware.com/en/blog-detail/google-play-console-account-2026-one-time-25-fee/)
- [COPPA Compliance in 2026: New FTC Rules, April Deadline – PrivacyLawMap](https://privacylawmap.com/blog/coppa-compliance-guide-2026)
