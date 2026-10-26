import { z } from "zod";

import { parseSAPhone, type SAPhone } from "@/lib/phone";

export const PHONE_ERROR = "Enter a South African mobile number, for example 082 123 4567.";

/** Parses what was typed after the fixed +27 prefix. "82 123 4567" works as well as "082…". */
export function parsePhoneField(input: string): SAPhone | null {
  const direct = parseSAPhone(input);
  if (direct.ok) return direct.phone;
  const digits = input.replace(/\D/g, "");
  if (digits.length === 9) {
    const withZero = parseSAPhone("0" + digits);
    if (withZero.ok) return withZero.phone;
  }
  return null;
}

export const phoneSchema = z.object({
  phone: z.string().refine((v) => parsePhoneField(v) !== null, PHONE_ERROR),
});

export const codeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from the SMS."),
});

/** Only same-origin paths are allowed as a redirect target after sign-in. */
export function safeRedirect(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/sign-in")) {
    return undefined;
  }
  return value;
}
