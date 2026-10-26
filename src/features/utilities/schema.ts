import { z } from "zod";

import { toCents } from "@/lib/money";
import { MAX_UTILITY_CENTS, toMilliUnits, unitsFromReadings } from "./split";

const dateString = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Choose a valid due date");

const utilityBillFields = z.object({
  type: z.enum(["electricity", "water"]),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Choose a bill month"),
  total: z.string().refine((value) => {
    const result = toCents(value);
    return result.ok && result.cents > 0 && result.cents <= MAX_UTILITY_CENTS;
  }, "Enter a bill total above R0 and within the database limit"),
  dueDate: dateString,
  splitMethod: z.enum(["equal", "by_room", "custom"]),
  includedRoomIds: z.array(z.string()).min(1, "Select at least one occupied room"),
  includeMainHouse: z.boolean(),
  previousReadings: z.record(z.string(), z.string()),
  currentReadings: z.record(z.string(), z.string()),
  mainHouseUnits: z.string(),
  customAmounts: z.record(z.string(), z.string()),
  note: z.string().max(500, "Keep the note under 500 characters"),
});

export const utilityBillDraftSchema = utilityBillFields.partial();

export const utilityBillSchema = utilityBillFields.superRefine((values, context) => {
  if (values.splitMethod === "by_room") {
    for (const roomId of values.includedRoomIds) {
      const previous = values.previousReadings[roomId] ?? "";
      const current = values.currentReadings[roomId] ?? "";
      try {
        const previousMilli = toMilliUnits(previous);
        const currentMilli = toMilliUnits(current);
        unitsFromReadings(previousMilli, currentMilli);
      } catch (error) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["currentReadings", roomId],
          message: error instanceof Error ? error.message : "Enter valid meter readings.",
        });
      }
    }
    if (values.includeMainHouse) {
      try {
        toMilliUnits(values.mainHouseUnits);
      } catch (error) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["mainHouseUnits"],
          message: error instanceof Error ? error.message : "Enter the main house units.",
        });
      }
    }
  }
  if (values.splitMethod === "custom") {
    const totalResult = toCents(values.total);
    if (!totalResult.ok) return;
    let total = 0;
    for (const roomId of values.includedRoomIds) {
      const rawAmount = values.customAmounts[roomId] ?? "";
      const amount = toCents(rawAmount);
      if (!amount.ok || amount.cents <= 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customAmounts", roomId],
          message: "Enter an amount above R0",
        });
        continue;
      }
      total += amount.cents;
    }
    if (total > totalResult.cents) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["total"],
        message: "Room amounts cannot exceed the bill total.",
      });
    }
  }
});

export type UtilityBillFormValues = z.input<typeof utilityBillSchema>;

export function emptyUtilityBill(today: string, defaultPeriod: string): UtilityBillFormValues {
  return {
    type: "electricity",
    period: defaultPeriod,
    total: "",
    dueDate: today,
    splitMethod: "equal",
    includedRoomIds: [],
    includeMainHouse: false,
    previousReadings: {},
    currentReadings: {},
    mainHouseUnits: "",
    customAmounts: {},
    note: "",
  };
}
