"use client";

import { useEffect, useMemo } from "react";

/**
 * PhoneInput: landskods-dropdown + nummerfält.
 * Sparar värdet som E.164 i föräldrakomponenten (+46701234567).
 * Tomt nummer => tom sträng.
 */

export type Country = {
  code: string;           // ISO (SE, NO, …) — bara för key/flag-lookup
  dialCode: string;       // "+46"
  name: string;           // "Sweden"
  flag: string;           // emoji
  // min/max siffror i det nationella numret (utan landskod)
  minDigits: number;
  maxDigits: number;
};

export const COUNTRIES: Country[] = [
  { code: "SE", dialCode: "+46",  name: "Sweden",         flag: "🇸🇪", minDigits: 8, maxDigits: 10 },
  { code: "NO", dialCode: "+47",  name: "Norway",         flag: "🇳🇴", minDigits: 8, maxDigits: 8 },
  { code: "DK", dialCode: "+45",  name: "Denmark",        flag: "🇩🇰", minDigits: 8, maxDigits: 8 },
  { code: "FI", dialCode: "+358", name: "Finland",        flag: "🇫🇮", minDigits: 8, maxDigits: 10 },
  { code: "DE", dialCode: "+49",  name: "Germany",        flag: "🇩🇪", minDigits: 9, maxDigits: 11 },
  { code: "FR", dialCode: "+33",  name: "France",         flag: "🇫🇷", minDigits: 9, maxDigits: 9 },
  { code: "GB", dialCode: "+44",  name: "United Kingdom", flag: "🇬🇧", minDigits: 9, maxDigits: 10 },
  { code: "IE", dialCode: "+353", name: "Ireland",        flag: "🇮🇪", minDigits: 8, maxDigits: 9 },
  { code: "NL", dialCode: "+31",  name: "Netherlands",    flag: "🇳🇱", minDigits: 9, maxDigits: 9 },
  { code: "ES", dialCode: "+34",  name: "Spain",          flag: "🇪🇸", minDigits: 9, maxDigits: 9 },
  { code: "IT", dialCode: "+39",  name: "Italy",          flag: "🇮🇹", minDigits: 9, maxDigits: 10 },
  { code: "PL", dialCode: "+48",  name: "Poland",         flag: "🇵🇱", minDigits: 9, maxDigits: 9 },
  { code: "PT", dialCode: "+351", name: "Portugal",       flag: "🇵🇹", minDigits: 9, maxDigits: 9 },
  { code: "CH", dialCode: "+41",  name: "Switzerland",    flag: "🇨🇭", minDigits: 9, maxDigits: 9 },
  { code: "AT", dialCode: "+43",  name: "Austria",        flag: "🇦🇹", minDigits: 8, maxDigits: 13 },
  { code: "BE", dialCode: "+32",  name: "Belgium",        flag: "🇧🇪", minDigits: 8, maxDigits: 9 },
  { code: "US", dialCode: "+1",   name: "United States",  flag: "🇺🇸", minDigits: 10, maxDigits: 10 },
  { code: "CA", dialCode: "+1",   name: "Canada",         flag: "🇨🇦", minDigits: 10, maxDigits: 10 },
  { code: "AU", dialCode: "+61",  name: "Australia",      flag: "🇦🇺", minDigits: 9, maxDigits: 9 },
];

const DEFAULT_COUNTRY = COUNTRIES[0];

/** Dela ett E.164-nummer (+46701234567) i { dialCode, national }. */
export function splitE164(value: string | null | undefined): { country: Country; national: string } {
  if (!value) return { country: DEFAULT_COUNTRY, national: "" };
  // Hitta längsta matchande landskod (viktigt för +1, +44, +358 osv)
  const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  const match = sorted.find((c) => value.startsWith(c.dialCode));
  if (!match) return { country: DEFAULT_COUNTRY, national: value.replace(/^\+/, "") };
  return { country: match, national: value.slice(match.dialCode.length) };
}

/** Sätt ihop till E.164. Returnerar "" om national är tomt. */
export function toE164(country: Country, national: string): string {
  const digits = national.replace(/\D/g, "");
  if (!digits) return "";
  return country.dialCode + digits;
}

/** Validera. Returnerar felmeddelande eller null. */
export function validatePhone(country: Country, national: string): string | null {
  const digits = national.replace(/\D/g, "");
  if (digits.length === 0) return null; // tomt = ok (frivilligt)
  if (digits.length < country.minDigits) {
    return `Too short for ${country.name} — expected at least ${country.minDigits} digits`;
  }
  if (digits.length > country.maxDigits) {
    return `Too long for ${country.name} — expected at most ${country.maxDigits} digits`;
  }
  return null;
}

type Props = {
  /** E.164-format eller tom sträng. */
  value: string;
  /** Ny E.164-sträng (tom = inget nummer). */
  onChange: (e164: string) => void;
  /** Callback för valideringsstatus — används av föräldern om den vill förhindra submit. */
  onValidChange?: (valid: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
};

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

export default function PhoneInput({ value, onChange, onValidChange, placeholder, disabled }: Props) {
  const { country, national } = useMemo(() => splitE164(value), [value]);

  const error = validatePhone(country, national);

  useEffect(() => {
    if (onValidChange) onValidChange(error === null);
  }, [error, onValidChange]);

  function setCountry(code: string) {
    const next = COUNTRIES.find((c) => c.code === code) ?? DEFAULT_COUNTRY;
    onChange(toE164(next, national));
  }

  function setNational(raw: string) {
    // Tillåt bara siffror och mellanslag/bindestreck visuellt; lagra bara siffror
    const cleaned = raw.replace(/[^\d\s-]/g, "");
    onChange(toE164(country, cleaned));
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ position: "relative" }}>
          <select
            value={country.code}
            onChange={(e) => setCountry(e.target.value)}
            disabled={disabled}
            aria-label="Country code"
            style={{
              appearance: "none",
              WebkitAppearance: "none",
              background: "#F5F6FA",
              border: "1.5px solid #E8EDF4",
              borderRadius: 12,
              padding: "12px 28px 12px 12px",
              fontSize: 14,
              color: "#1A2340",
              outline: "none",
              fontFamily: FONT,
              cursor: disabled ? "not-allowed" : "pointer",
              minWidth: 112,
            }}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.dialCode}
              </option>
            ))}
          </select>
          <div
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              color: "#8B90A4",
              fontSize: 10,
            }}
          >
            ▼
          </div>
        </div>

        <input
          type="tel"
          inputMode="tel"
          value={national}
          onChange={(e) => setNational(e.target.value)}
          placeholder={placeholder ?? "70 123 45 67"}
          disabled={disabled}
          style={{
            flex: 1,
            background: "#F5F6FA",
            border: `1.5px solid ${error ? "#F5CCCC" : "#E8EDF4"}`,
            borderRadius: 12,
            padding: "12px 14px",
            fontSize: 14,
            color: "#1A2340",
            outline: "none",
            fontFamily: FONT,
            boxSizing: "border-box",
          }}
        />
      </div>
      {error && (
        <div style={{ fontSize: 12, color: "#D94F4F", marginTop: 6 }}>{error}</div>
      )}
    </div>
  );
}
