import { z } from "zod";

import {
  isValidAmountCents,
  isValidPaidOn,
  MAX_AMOUNT_CENTS,
} from "../../../supabase/functions/_shared/payment-validation";
import { toCents } from "@/lib/money";

export const TENANT_PAYMENT_METHODS = ["eft", "ewallet", "cash", "other"] as const;
export const MAX_SOURCE_PROOF_BYTES = 5 * 1024 * 1024;

export function createTenantPaymentSchema(today: string) {
  return z.object({
    amount: z.string().superRefine((value, context) => {
      const amount = toCents(value);
      if (!amount.ok) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: amount.error });
      } else if (!isValidAmountCents(amount.cents)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Enter an amount above R0 and no more than R${(MAX_AMOUNT_CENTS / 100).toLocaleString("en-ZA")}`,
        });
      }
    }),
    paidOn: z
      .string()
      .refine((value) => isValidPaidOn(value, today), "Enter a date within the last 90 days."),
    method: z.enum(TENANT_PAYMENT_METHODS),
    proof: z
      .custom<File | null>(
        (value) => value === null || (typeof File !== "undefined" && value instanceof File),
        "Choose a photo or PDF.",
      )
      .refine(
        (file) =>
          file === null ||
          ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type),
        "Choose a JPEG, PNG, WebP photo or PDF.",
      )
      .refine(
        (file) => file === null || file.size <= MAX_SOURCE_PROOF_BYTES,
        "Choose a photo or PDF under 5 MB.",
      )
      .refine(
        (file) => file === null || file.type !== "application/pdf" || file.size <= 2 * 1024 * 1024,
        "Choose a PDF under 2 MB.",
      ),
  });
}

export type TenantPaymentFormValues = z.input<ReturnType<typeof createTenantPaymentSchema>>;
