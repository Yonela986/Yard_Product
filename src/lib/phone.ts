/** South African mobile numbers. */

export interface SAPhone {
  /** "+27821234567" — for Supabase sign-in. */
  e164: string;
  /** "27821234567" — for wa.me links. */
  whatsapp: string;
  /** "082 123 4567" — for display. */
  display: string;
}

export type ParsePhoneResult = { ok: true; phone: SAPhone } | { ok: false; error: string };

export function parseSAPhone(input: string): ParsePhoneResult {
  const trimmed = input.trim();
  if (/[a-z]/i.test(trimmed)) return { ok: false, error: "Use numbers only" };
  if (!/^[\d\s()+\-.]+$/.test(trimmed)) return { ok: false, error: "Use numbers only" };

  let digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) {
    if (!digits.startsWith("27")) return { ok: false, error: "Use a South African number" };
    digits = digits.slice(2);
  } else if (digits.startsWith("0027")) {
    digits = digits.slice(4);
  } else if (digits.startsWith("27") && digits.length === 11) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  } else {
    return { ok: false, error: "Start with 0 or +27" };
  }

  if (digits.length !== 9)
    return { ok: false, error: "A mobile number has 10 digits, like 082 123 4567" };
  if (!/^[678]/.test(digits))
    return { ok: false, error: "This looks like a landline. Use a mobile number" };

  const local = "0" + digits;
  return {
    ok: true,
    phone: {
      e164: "+27" + digits,
      whatsapp: "27" + digits,
      display: `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`,
    },
  };
}

export function isValidSAPhone(input: string): boolean {
  return parseSAPhone(input).ok;
}
