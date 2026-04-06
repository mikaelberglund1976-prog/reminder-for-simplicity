import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F4F0]">
      {/* Navigation */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔔</span>
          <span className="font-semibold text-[#1C1C28] text-[15px] tracking-tight">
            AssistIQ
          </span>
        </div>
        <Link
          href="/login"
          className="text-[14px] font-medium text-[#7C7C8A] hover:text-[#1C1C28] transition-colors"
        >
          Log in
        </Link>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6 py-16 sm:py-24">
        <div className="max-w-xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#7C7C8A] mb-10 tracking-wide uppercase">
            <span>by Berget &amp; Fredde</span>
          </div>

          {/* Headline */}
          <h1 className="text-[42px] sm:text-[56px] font-bold text-[#1C1C28] leading-[1.1] tracking-tight mb-6">
            Never forget<br />
            <span className="text-[#4A5FD5]">what matters.</span>
          </h1>

          {/* Subtext */}
          <p className="text-[18px] text-[#7C7C8A] mb-12 leading-relaxed max-w-md mx-auto">
            Reminders for subscriptions, renewals, birthdays, and everything else important — delivered straight to your inbox.
          </p>

          {/* CTA */}
          <Link
            href="/register"
            className="btn-primary text-[16px] px-10 py-4 rounded-xl w-full sm:w-auto"
          >
            Get started — it&apos;s free
          </Link>

          <p className="text-[14px] text-[#7C7C8A] mt-5">
            Already a member?{" "}
            <Link href="/login" className="text-[#4A5FD5] font-medium hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </main>

      {/* Feature strip */}
      <section className="border-t border-[#E4E3DE] bg-white py-12 px-6">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10 text-center">
          <div>
            <div className="text-3xl mb-3">📅</div>
            <h3 className="font-semibold text-[#1C1C28] mb-1 text-[15px]">Subscriptions</h3>
            <p className="text-[14px] text-[#7C7C8A] leading-relaxed">
              Keep track of every service and plan you're paying for
            </p>
          </div>
          <div>
            <div className="text-3xl mb-3">🎂</div>
            <h3 className="font-semibold text-[#1C1C28] mb-1 text-[15px]">Birthdays</h3>
            <p className="text-[14px] text-[#7C7C8A] leading-relaxed">
              Never miss an important day for the people you care about
            </p>
          </div>
          <div>
            <div className="text-3xl mb-3">✉️</div>
            <h3 className="font-semibold text-[#1C1C28] mb-1 text-[15px]">Email reminders</h3>
            <p className="text-[14px] text-[#7C7C8A] leading-relaxed">
              Automatic notifications in your inbox, right when you need them
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-[13px] text-[#7C7C8A] border-t border-[#E4E3DE]">
        © 2026 AssistIQ · by Berget &amp; Fredde
      </footer>
    </div>
  );
}
