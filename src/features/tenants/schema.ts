import { z } from "zod";

import { todayInSA } from "@/lib/dates";
import { toCents } from "@/lib/money";
import { parseSAPhone } from "@/lib/phone";
import type { Language } from "@/types/domain";

export const TENANT_LANGUAGES = ["en", "zu", "xh", "st"] as const satisfies readonly Language[];

function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const requiredText = (message: string) =>
  z
    .string()
    .trim()
    .refine((value) => value.length > 0, message);

function parseDepositValue(
  value: string,
): { ok: true; cents: number } | { ok: false; error: string } {
  return value.trim() === "" ? { ok: true, cents: 0 } : toCents(value);
}

export const tenantSchema = z.object({
  name: requiredText("Enter a tenant name"),
  phone: z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (!parseSAPhone(value).ok) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a South African mobile number, for example 082 123 4567",
        });
      }
    }),
  roomId: requiredText("Choose a room"),
  moveInDate: z.string().trim().refine(isValidISODate, "Choose a valid move-in date"),
  deposit: z
    .string()
    .default("0")
    .superRefine((value, ctx) => {
      const parsed = parseDepositValue(value);
      if (!parsed.ok) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: parsed.error });
        return;
      }
      if (parsed.cents < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Deposit cannot be negative" });
      }
    }),
  language: z.enum(TENANT_LANGUAGES),
});

export type TenantFormValues = z.input<typeof tenantSchema>;

export function emptyTenantForm(roomId = ""): TenantFormValues {
  return {
    name: "",
    phone: "",
    roomId,
    moveInDate: todayInSA(),
    deposit: "",
    language: "en",
  };
}

export function parseDepositInput(value: string): number {
  const parsed = parseDepositValue(value);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.cents;
}
