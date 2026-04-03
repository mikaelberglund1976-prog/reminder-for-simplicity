import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔔</span>
          <span className="font-bold text-[#1A1A2E] text-lg">Reminder for Simplicity</span>
        </div>
        <Link
          href="/login"
          className="text-sm font-semibold text-[#4F6EF7] hover:underline"
        >
          Logga in
        </Link>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#EEF2FF] text-[#4F6EF7] text-sm font-semibold px-4 py-1.5 rounded-full mb-8">
            <span>✦</span>
            <span>by Berget &amp; Fredde</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl font-bold text-[#1A1A2E] leading-tight mb-6">
            Glöm aldrig det
            <br />
            <span className="text-[#4F6EF7]">som spelar roll.</span>
          </h1>

          {/* Subtext */}
          <p className="text-xl text-gray-500 mb-12 leading-relaxed max-w-lg mx-auto">
            Påminnelser för abonnemang, avtalsförnyelser och allt annat viktigt —
            direkt i din inkorg.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="btn-primary text-center text-lg px-10 py-4 rounded-xl shadow-md hover:shadow-lg transition-shadow"
            >
              Skapa konto — det är gratis
            </Link>
            <Link
              href="/login"
              className="btn-secondary text-center text-lg px-10 py-4 rounded-xl"
            >
              Logga in
            </Link>
          </div>

          {/* Social proof */}
          <p className="text-sm text-gray-400 mt-8">
            Inget kreditkort. Inga dolda avgifter. Kom igång på 30 sekunder.
          </p>
        </div>
      </main>

      {/* Feature strip */}
      <section className="border-t border-[#E5E7EB] bg-white py-10 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl mb-2">📅</div>
            <h3 className="font-semibold text-[#1A1A2E] mb-1">Abonnemang</h3>
            <p className="text-sm text-gray-500">Håll koll på alla dina löpande tjänster och avtal</p>
          </div>
          <div>
            <div className="text-3xl mb-2">🎂</div>
            <h3 className="font-semibold text-[#1A1A2E] mb-1">Födelsedagar</h3>
            <p className="text-sm text-gray-500">Glöm aldrig en viktig dag för folk du bryr dig om</p>
          </div>
          <div>
            <div className="text-3xl mb-2">✉️</div>
            <h3 className="font-semibold text-[#1A1A2E] mb-1">Email-påminnelse</h3>
            <p className="text-sm text-gray-500">Automatiska notiser direkt i din inkorg i god tid</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-gray-400 border-t border-[#E5E7EB]">
        © 2025 Reminder for Simplicity · by Berget &amp; Fredde
      </footer>
    </div>
  );
}
