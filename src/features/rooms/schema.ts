import { z } from "zod";

import { toCents } from "@/lib/money";

export function naturalRoomSort<T extends { name: string }>(rooms: T[]): T[] {
  return [...rooms].sort((a, b) => compareRoomNames(a.name, b.name));
}

export function compareRoomNames(left: string, right: string): number {
  const leftParts = left.trim().match(/\d+|\D+/g) ?? [left.trim()];
  const rightParts = right.trim().match(/\d+|\D+/g) ?? [right.trim()];
  const max = Math.max(leftParts.length, rightParts.length);

  for (let i = 0; i < max; i += 1) {
    const l = leftParts[i] ?? "";
    const r = rightParts[i] ?? "";
    const lIsNumber = /^\d+$/.test(l);
    const rIsNumber = /^\d+$/.test(r);

    if (lIsNumber && rIsNumber) {
      const diff = Number(l) - Number(r);
      if (diff !== 0) return diff;
      continue;
    }

    if (lIsNumber !== rIsNumber) return lIsNumber ? -1 : 1;

    const diff = l.localeCompare(r, undefined, { numeric: true, sensitivity: "base" });
    if (diff !== 0) return diff;
  }

  return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
}

export function hasDuplicateRoomName(names: string[]): boolean {
  const normalised = new Set<string>();
  for (const name of names) {
    const key = name.trim().toLowerCase().replace(/\s+/g, " ");
    if (!key) continue;
    if (normalised.has(key)) return true;
    normalised.add(key);
  }
  return false;
}

export const roomFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a room name"),
  rent: z.string().superRefine((value, ctx) => {
    const parsed = toCents(value);
    if (!parsed.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: parsed.error });
    } else if (parsed.cents <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Rent must be more than R0" });
    }
  }),
  dueDay: z
    .string()
    .refine(
      (value) => /^\d{1,2}$/.test(value) && Number(value) >= 1 && Number(value) <= 28,
      "Choose a day from 1 to 28",
    ),
});

export const bankDetailsSchema = z
  .string()
  .max(500, "Keep payment instructions to 500 characters or fewer");

export type RoomFormValues = z.input<typeof roomFormSchema>;

export function emptyRoomForm(): RoomFormValues {
  return { name: "", rent: "", dueDay: "1" };
}

export function roomFormPayload(values: RoomFormValues) {
  const parsed = roomFormSchema.parse(values);
  const rent = toCents(parsed.rent);
  if (!rent.ok) throw new Error(rent.error);
  return {
    name: parsed.name,
    monthly_rent_cents: rent.cents,
    due_day: Number(parsed.dueDay),
  };
}
