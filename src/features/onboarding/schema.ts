import { z } from "zod";

import { toCents } from "@/lib/money";
import type { Language, OnboardingRoomInput } from "@/types/domain";

export const LANGUAGES = ["en", "zu", "xh", "st"] as const satisfies readonly Language[];

const requiredText = (message: string) => z.string().refine((v) => v.trim().length > 0, message);

export const roomSchema = z.object({
  name: requiredText("Enter a room name"),
  rent: z.string().superRefine((v, ctx) => {
    const r = toCents(v);
    if (!r.ok) ctx.addIssue({ code: z.ZodIssueCode.custom, message: r.error });
    else if (r.cents <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Rent must be more than R0" });
    }
  }),
  dueDay: z
    .string()
    .refine(
      (v) => /^\d{1,2}$/.test(v) && Number(v) >= 1 && Number(v) <= 28,
      "Choose a day from 1 to 28",
    ),
});

export const aboutSchema = z.object({
  name: requiredText("Enter your name"),
  language: z.enum(LANGUAGES),
});

export const propertySchema = z.object({
  propertyName: requiredText("Enter a property name"),
  address: z.string(),
});

export const roomsStepSchema = z.object({
  rooms: z.array(roomSchema).min(1, "Add at least one room").max(50, "Add at most 50 rooms"),
});

export const onboardingSchema = aboutSchema.merge(propertySchema).merge(roomsStepSchema);

export type RoomFormValues = z.input<typeof roomSchema>;
export type OnboardingFormValues = z.input<typeof onboardingSchema>;

export const emptyRoom = (): RoomFormValues => ({ name: "", rent: "", dueDay: "1" });

export const emptyOnboarding = (): OnboardingFormValues => ({
  name: "",
  language: "en",
  propertyName: "",
  address: "",
  rooms: [emptyRoom()],
});

const normalise = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

/** Indexes of rooms whose name (ignoring case and spacing) is used more than once. */
export function findDuplicateRoomIndexes(names: string[]): Set<number> {
  const seen = new Map<string, number[]>();
  names.forEach((n, i) => {
    const key = normalise(n);
    if (key === "") return;
    seen.set(key, [...(seen.get(key) ?? []), i]);
  });
  const out = new Set<number>();
  for (const idxs of seen.values()) if (idxs.length > 1) idxs.forEach((i) => out.add(i));
  return out;
}

/** Rooms named "Room N", continuing after any rows already present. */
export function generateRooms(
  count: number,
  rent: string,
  dueDay: string,
  startAt = 1,
): RoomFormValues[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `Room ${startAt + i}`,
    rent,
    dueDay,
  }));
}

export function toRoomPayload(room: RoomFormValues): OnboardingRoomInput {
  const r = toCents(room.rent);
  if (!r.ok) throw new Error(r.error);
  return { name: room.name.trim(), monthly_rent_cents: r.cents, due_day: Number(room.dueDay) };
}

/** Count and total of rooms with a valid rent, for the review line. */
export function summariseRooms(rooms: RoomFormValues[]): { count: number; totalCents: number } {
  let totalCents = 0;
  for (const room of rooms) {
    const r = toCents(room.rent);
    if (r.ok) totalCents += r.cents;
  }
  return { count: rooms.length, totalCents };
}
