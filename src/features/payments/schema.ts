import { z } from "zod";

import { toCents } from "@/lib/money";

export const PAYMENT_METHODS = ["cash", "eft", "ewallet", "other"] as const;
export const MAX_PROOF_BYTES = 5 * 1024 * 1024;
export const ALLOWED_PROOF_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export function createPaymentSchema(today: string) {
  return z.object({
    amount: z.string().superRefine((value, ctx) => {
      const parsed = toCents(value);
      if (!parsed.ok) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: parsed.error });
      } else if (parsed.cents <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Amount must be more than R0" });
      }
    }),
    paidOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid payment date")
      .refine((value) => {
        const parsed = new Date(`${value}T00:00:00Z`);
        return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
      }, "Enter a valid payment date")
      .refine((value) => value <= today, "Payment date cannot be in the future"),
    method: z.enum(PAYMENT_METHODS),
    proof: z
      .custom<File | null>(
        (value) => value === null || (typeof File !== "undefined" && value instanceof File),
        "Choose a photo or PDF",
      )
      .refine(
        (file) => file === null || ALLOWED_PROOF_TYPES.some((type) => type === file.type),
        "Choose a JPEG, PNG, WebP photo or PDF",
      )
      .refine(
        (file) => file === null || file.size <= MAX_PROOF_BYTES,
        "That file is too large. Choose a photo or PDF under 5 MB.",
      ),
  });
}

export type PaymentFormValues = z.input<ReturnType<typeof createPaymentSchema>>;

export function paymentPayload(values: PaymentFormValues): {
  amount_cents: number;
  paid_on: string;
  method: (typeof PAYMENT_METHODS)[number];
} {
  const parsed = toCents(values.amount);
  if (!parsed.ok) throw new Error(parsed.error);
  return {
    amount_cents: parsed.cents,
    paid_on: values.paidOn,
    method: values.method,
  };
}

export const voidPaymentSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Enter a reason")
    .max(500, "Keep the reason to 500 characters or fewer"),
});

export function createConfirmPaymentSchema(today: string) {
  return z.object({
    amount: z.string().superRefine((value, ctx) => {
      const parsed = toCents(value);
      if (!parsed.ok) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: parsed.error });
      } else if (parsed.cents <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Amount must be more than R0" });
      }
    }),
    paidOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid payment date")
      .refine((value) => {
        const parsed = new Date(`${value}T00:00:00Z`);
        return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
      }, "Enter a valid payment date")
      .refine((value) => value <= today, "Payment date cannot be in the future"),
    method: z.enum(PAYMENT_METHODS),
  });
}

export type ConfirmPaymentFormValues = z.input<ReturnType<typeof createConfirmPaymentSchema>>;

export const declinePendingPaymentSchema = z.object({
  reason: z.string().trim().max(500, "Keep the reason to 500 characters or fewer"),
});
