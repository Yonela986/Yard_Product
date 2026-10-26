/** Money is always integer cents (ZAR). No floating-point arithmetic. */

export type Cents = number;

export type ToCentsResult = { ok: true; cents: Cents } | { ok: false; error: string };

/**
 * Converts typed input to integer cents.
 * Accepts "1200", "1 200", "1200,50", "1200.5", "R1 200,50".
 * Rejects negatives, letters and more than two decimals.
 */
export function toCents(input: string): ToCentsResult {
  let s = input.trim();
  if (s.startsWith("-")) return { ok: false, error: "Amount cannot be negative" };
  if (s.startsWith("R") || s.startsWith("r")) s = s.slice(1).trim();
  // Remove ordinary and non-breaking spaces used as thousands separators.
  s = s.replace(/[\s\u00a0\u202f]/g, "");
  if (s === "") return { ok: false, error: "Enter an amount" };

  const match = /^(\d+)(?:[.,](\d*))?$/.exec(s);
  if (!match) return { ok: false, error: "Use numbers only, for example 1 200,50" };

  const whole = match[1] ?? "0";
  const fraction = match[2] ?? "";
  if (fraction.length > 2) return { ok: false, error: "Use at most two decimals" };

  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) return { ok: false, error: "Amount is too large" };
  return { ok: true, cents };
}

const NBSP = "\u00a0";

function groupThousands(digits: string): string {
  let out = "";
  for (let i = 0; i < digits.length; i++) {
    const fromEnd = digits.length - i;
    if (i > 0 && fromEnd % 3 === 0) out += NBSP;
    out += digits[i];
  }
  return out;
}

export interface FormatMoneyOptions {
  /** 'always' shows two decimals even for whole rands. Only for PDF receipts and statements. */
  showCents?: "auto" | "always";
}

/** Formats cents the South African way: "R1 200", "R1 250,50", "R0", "-R50". */
export function formatMoney(cents: Cents, options: FormatMoneyOptions = {}): string {
  if (!Number.isInteger(cents)) throw new Error("formatMoney expects integer cents");
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const rands = Math.floor(abs / 100);
  const rest = abs % 100;
  const showCents = options.showCents === "always" || rest !== 0;
  const body =
    groupThousands(String(rands)) + (showCents ? "," + String(rest).padStart(2, "0") : "");
  return (negative ? "-" : "") + "R" + body;
}
