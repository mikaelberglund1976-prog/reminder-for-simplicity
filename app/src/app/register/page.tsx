"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Något gick fel. Försök igen.");
      setLoading(false);
      return;
    }

    // Auto-login efter registrering
    const result = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    if (result?.error) {
      router.push("/login");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔔</div>
          <h1 className="text-2xl font-bold text-[#1A1A2E]">Skapa konto</h1>
          <p className="text-gray-500 mt-1">Gratis och tar 30 sekunder</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="label">Namn</label>
              <input
                type="text"
                className="input"
                placeholder="Ditt namn"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="din@email.se"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="label">Lösenord</label>
              <input
                type="password"
                className="input"
                placeholder="Minst 8 tecken, 1 stor bokstav, 1 siffra"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Skapar konto..." : "Skapa konto"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Redan konto?{" "}
            <Link href="/login" className="text-[#4F6EF7] font-medium hover:underline">
              Logga in
            </Link>
          </p>

          <p className="text-center text-xs text-gray-400 mt-4">
            Genom att skapa konto godkänner du våra{" "}
            <Link href="/terms" className="underline">villkor</Link> och{" "}
            <Link href="/privacy" className="underline">integritetspolicy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
