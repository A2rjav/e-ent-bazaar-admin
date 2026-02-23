import { COUNTRY_CODES } from "@/lib/country-codes";

/**
 * Strips everything except digits and a leading '+' from a phone string.
 */
export function stripPhone(raw: string): string {
  return raw.replace(/[^\d+]/g, "");
}

/**
 * Extracts just the local digits from a phone string (after the country code).
 */
export function extractLocalDigits(raw: string): string {
  const stripped = stripPhone(raw);
  if (stripped.startsWith("+")) {
    for (const c of COUNTRY_CODES) {
      const dialDigits = c.dialCode.replace("+", "+");
      if (stripped.startsWith(dialDigits)) {
        return stripped.slice(dialDigits.length);
      }
    }
  }
  return stripped.replace(/^\+/, "");
}

/**
 * Returns true if the phone string has a valid country code
 * and the correct number of local digits for that country.
 */
export function isValidPhone(raw: string): boolean {
  if (!raw || !raw.trim()) return false;
  const stripped = stripPhone(raw);

  if (!stripped.startsWith("+")) return false;

  for (const c of COUNTRY_CODES) {
    if (stripped.startsWith(c.dialCode)) {
      const local = stripped.slice(c.dialCode.length);
      if (/^\d+$/.test(local) && local.length >= c.maxDigits - 2 && local.length <= c.maxDigits) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Formats a phone value for display: "+91 98765 43210".
 * If the input is empty/null, returns "—".
 */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "—";
  const stripped = stripPhone(raw);

  if (stripped.startsWith("+")) {
    for (const c of COUNTRY_CODES) {
      if (stripped.startsWith(c.dialCode)) {
        const local = stripped.slice(c.dialCode.length);
        if (!local) return c.dialCode;
        return `${c.dialCode} ${local}`;
      }
    }
  }

  return raw;
}

/**
 * Normalises a phone value for storage / API calls: "+CCXXXXXXXXXX" (no spaces).
 */
export function normalizePhone(raw: string): string {
  return stripPhone(raw);
}

/**
 * Validation error message for phone inputs.
 */
export const PHONE_ERROR = "Enter a valid phone number";
