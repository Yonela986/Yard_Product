import { z } from "zod";

import { toCents } from "@/lib/money";

export const editChargeSchema = z.object({
  amount: z.string().superRefine((value, ctx) => {
    const parsed = toCents(value);
    if (!parsed.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: parsed.error });
    } else if (parsed.cents <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Amount must be more than R0" });
    }
  }),
  note: z.string().trim().max(300, "Keep the note to 300 characters or fewer"),
});

export type EditChargeValues = z.input<typeof editChargeSchema>;

export function editChargePayload(values: EditChargeValues) {
  const parsed = editChargeSchema.parse(values);
  const amount = toCents(parsed.amount);
  if (!amount.ok) throw new Error(amount.error);
  return {
    amount_cents: amount.cents,
    note: parsed.note || null,
  };
}
