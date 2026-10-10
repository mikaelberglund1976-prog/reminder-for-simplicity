// 2026-10-04: integritetsmeddelandet på svenska. Samma innehåll som
// PrivacyEn.tsx — ändra båda när texten ändras i sak (och höj CONSENT_VERSION).
// Bör läsas av en jurist före bred lansering (LAUNCH_CHECKLIST.md, Fas A).
import { ADMIN_EMAIL } from "@/lib/adminConfig";
import { CONSENT_VERSION } from "@/lib/consent-version";
import { H, P, UL, cell, head } from "./PrivacyEn";

export function PrivacySv() {
  return (
    <>
      <h1 style={{ fontSize: 30, fontWeight: 800, color: "var(--fg)", margin: "0 0 6px", letterSpacing: "-0.6px" }}>Integritetsmeddelande</h1>
      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>Version {CONSENT_VERSION} · gäller appen på den här adressen</div>

      <div style={{ background: "var(--tint-accent)", borderRadius: 16, padding: "14px 16px", marginBottom: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--fg)", marginBottom: 6 }}>Kort version</div>
        <UL items={[
          "Vi sparar det du och din familj lägger in i appen – påminnelser, listor, läxor, sysslor, aktiviteter, önskelistor och bilder – så att appen kan visa det för familjen och påminna er.",
          "Bara personer i din familj ser familjens saker. Barn ser bara sina egna saker och den delade inköpslistan.",
          "Vi säljer aldrig era uppgifter och använder dem aldrig för riktad reklam. Vuxna med gratisversionen kan se vår egen enkla reklam; barn och Pro-familjer gör det aldrig.",
          "Du kan ladda ner allt (Inställningar → Exportera mina uppgifter) och radera ditt konto när du vill.",
        ]} />
      </div>

      <H>1. Vem som är ansvarig</H>
      <P>
        Reminder for Simplicity drivs av Mikael Berglund, Sverige, som är personuppgiftsansvarig för personuppgifterna i appen.
        När tjänsten flyttas till ett registrerat bolag anges bolagets namn, organisationsnummer och adress här, och du får veta det i appen.
      </P>
      <P>Kontakt för allt som rör dina uppgifter: <a href={`mailto:${ADMIN_EMAIL}`} style={{ color: "var(--accent)", fontWeight: 700 }}>{ADMIN_EMAIL}</a>. Vi svarar på förfrågningar inom en månad.</P>

      <H>2. Vad vi sparar och varför</H>
      <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 14, background: "var(--surface)", marginBottom: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
          <thead>
            <tr><th style={head}>Vad</th><th style={head}>Varför</th><th style={head}>Rättslig grund (GDPR art. 6)</th></tr>
          </thead>
          <tbody>
            <tr><td style={cell}>Namn, e-post, valfritt telefonnummer, tidszon, valuta; ett hashat lösenord eller en koppling till Google-inloggning</td><td style={cell}>Ditt konto och inloggningen</td><td style={cell}>Avtal</td></tr>
            <tr><td style={cell}>Din familj och varje persons roll</td><td style={cell}>För att dela listor och kalender med rätt personer</td><td style={cell}>Avtal</td></tr>
            <tr><td style={cell}>Påminnelser (med belopp och kategorier du väljer), inköpslistor, önskelistor, sysslor, aktiviteter, läxor och prov</td><td style={cell}>För att visa dem och mejla de påminnelser du bett om</td><td style={cell}>Avtal</td></tr>
            <tr><td style={cell}>Ett barns kalenderlänk från SchoolSoft, och de läxor, prov och skolhändelser som hämtas därifrån en gång om dagen</td><td style={cell}>För att visa barnets skolsaker i appen – bara om en vuxen kopplar in den</td><td style={cell}>Avtal (kan kopplas bort när som helst)</td></tr>
            <tr><td style={cell}>Profilbilder och en familjebild</td><td style={cell}>För att visa vem som är vem – bara om du lägger in dem</td><td style={cell}>Samtycke (kan tas bort när som helst)</td></tr>
            <tr><td style={cell}>Bekräftad e-post, godkännande av nya konton, begäran om radering</td><td style={cell}>För att hålla kontona säkra</td><td style={cell}>Berättigat intresse</td></tr>
            <tr><td style={cell}>Idéer &amp; röster</td><td style={cell}>Den gemensamma idétavlan – ditt namn visas för andra användare</td><td style={cell}>Berättigat intresse</td></tr>
            <tr><td style={cell}>Visningar och klick på annonser, bara som summor</td><td style={cell}>Rapportering till annonsörer, inga profiler om dig</td><td style={cell}>Berättigat intresse</td></tr>
          </tbody>
        </table>
      </div>
      <P>
        Vi frågar inte efter din ålder, adress eller ditt personnummer. Om du skriver in något som rör hälsa (till exempel en läkartid i kategorin &quot;Hälsa&quot;) är det ditt val; vi sparar det bara och visar det för dem du delar det med.
      </P>

      <H>3. Barn</H>
      <P>
        Ett barnkonto läggs alltid till av en förälder eller vårdnadshavare i familjen, som bekräftar att hen är barnets vårdnadshavare och godkänner det här meddelandet för barnets räkning.
        Familjens avtal med oss är den rättsliga grunden; vi ber inte barn om eget samtycke.
        Du måste vara minst 13 år för att skapa ett konto på egen hand; yngre barn läggs till av en förälder.
      </P>
      <UL items={[
        "Barn ser bara sina egna läxor, prov, sysslor, aktiviteter och sin önskelista, plus familjens inköpslista.",
        "Vuxna i familjen kan se vad ett barn har, och en förälder kan radera ett barns konto.",
        "Barn ser aldrig reklam.",
        "Ett barns bild visas bara inom familjen.",
        "Om en vuxen kopplar in ett barns SchoolSoft-kalender sparas länken bara på vår server – ingen i familjen, inte heller barnet, kan se den. Bara vuxna kan koppla in, ändra eller ta bort den.",
      ]} />

      <H>4. Vilka som hjälper oss driva appen</H>
      <P>De här företagen behandlar uppgifter åt oss enligt sina villkor för personuppgiftsbiträden. Inget delas med någon annan om inte lagen kräver det.</P>
      <UL items={[
        <><b>Supabase</b> – databas, lagrad i Frankfurt, Tyskland (EU).</>,
        <><b>Vercel</b> – drift; appen körs i Frankfurt (EU). Vercel är ett amerikanskt företag.</>,
        <><b>Resend</b> – skickar våra mejl; amerikanskt företag. Överföringar utanför EU sker med stöd av EU–US Data Privacy Framework eller EU:s standardavtalsklausuler.</>,
        <><b>Anthropic</b> – bara när en vuxen själv väljer att skanna ett veckobrev, en lapp eller ett skolmejl. Bilden eller PDF:en skickas till Anthropics AI-tjänst (USA) för att läsas av och sparas inte hos oss; inga namn eller andra uppgifter från appen skickas med. Anthropic tränar inte sina modeller på uppgifterna. Överföringen sker med stöd av EU:s standardavtalsklausuler i Anthropics personuppgiftsbiträdesavtal.</>,
        <><b>Google</b> – bara om du väljer &quot;Fortsätt med Google&quot;. Vi sparar ditt Google-konto-id, inte ditt Google-lösenord eller dina tokens.</>,
        <><b>Open Food Facts</b> (Frankrike) – bara när du skannar en streckkod slår din webbläsare upp koden där.</>,
      ]} />

      <H>5. Hur länge vi sparar uppgifterna</H>
      <UL items={[
        "Så länge du har ett konto.",
        "När ett konto raderas döljs det direkt och sparas i 60 dagar ifall du ångrar dig – sedan tas det bort för gott, även din profilbild.",
        "Det du har skapat för familjen (till exempel delade påminnelser) stannar hos familjen; det som bara rör dig följer med ditt konto.",
        "Säkerhetskopior hos vår databasleverantör kan innehålla raderade uppgifter en kort tid innan de skrivs över.",
        "Inbjudningar slutar gälla efter 48 timmar (vuxna) eller 7 dagar (barn).",
      ]} />

      <H>6. Dina rättigheter</H>
      <UL items={[
        <><b>Se och ladda ner</b> dina uppgifter: Inställningar → Exportera mina uppgifter.</>,
        <><b>Rätta</b> dem: ändra dina uppgifter under Inställningar.</>,
        <><b>Radera</b> dem: Inställningar → Radera konto (en administratör i familjen godkänner, eller så bekräftar du själv om du är administratör).</>,
        <><b>Återkalla samtycke</b> för bilder: Familjemedlemmar → Ta bort bild.</>,
        <><b>Invända mot eller begränsa</b> behandlingen, eller fråga något annat: mejla oss (avsnitt 1).</>,
        <><b>Klaga</b> hos Integritetsskyddsmyndigheten (IMY), <a href="https://www.imy.se" style={{ color: "var(--accent)" }}>imy.se</a>.</>,
      ]} />
      <P>För barn använder föräldern eller vårdnadshavaren rättigheterna för barnets räkning.</P>

      <H>7. Säkerhet</H>
      <P>
        All trafik går över HTTPS. Lösenord sparas som bcrypt-hashar och länkar i våra mejl som envägshashar. Behörigheten kontrolleras på servern vid varje anrop.
        En sak fungerar med avsikt utan inloggning: din personliga kalenderlänk – den som har länken kan läsa din kalender, så behåll den för dig själv. Du kan skapa en ny länk (då slutar den gamla fungera) under Inställningar.
        Om en personuppgiftsincident innebär en risk för dig meddelar vi myndigheten inom 72 timmar och dig utan dröjsmål.
      </P>

      <H>8. Kakor</H>
      <P>Vi använder bara de kakor som behövs för att hålla dig inloggad, plus en som kommer ihåg valt språk. Inga spårnings- eller reklamkakor. Dina val av tema och vy sparas i din egen webbläsare.</P>

      <H>9. Ändringar</H>
      <P>När meddelandet ändras på ett sätt som spelar roll visar vi det i appen och uppdaterar versionen överst.</P>
    </>
  );
}
