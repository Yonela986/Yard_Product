import type { UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/Input";
import { UTILITY_UNITS } from "@/types/domain";
import { fromMilliUnits, toMilliUnits, unitsFromReadings } from "../split";
import type { UtilityBillFormValues } from "../schema";

export function ReadingFields({
  roomId,
  roomName,
  type,
  form,
  previousValue,
  currentValue,
}: {
  roomId: string;
  roomName: string;
  type: UtilityBillFormValues["type"];
  form: UseFormReturn<UtilityBillFormValues>;
  previousValue: string;
  currentValue: string;
}) {
  const previousError = form.getFieldState(`previousReadings.${roomId}`).error?.message;
  const currentError = form.getFieldState(`currentReadings.${roomId}`).error?.message;
  let unitsLabel = "";
  try {
    if (previousValue !== "" && currentValue !== "") {
      const units = unitsFromReadings(toMilliUnits(previousValue), toMilliUnits(currentValue));
      unitsLabel = `${fromMilliUnits(units)} ${UTILITY_UNITS[type]}`;
    }
  } catch {
    unitsLabel = "";
  }
  return (
    <fieldset className="grid gap-3 border-l border-line pl-3 sm:grid-cols-2">
      <legend className="text-secondary font-semibold text-ink">{roomName} readings</legend>
      <Input
        label="Previous reading"
        inputMode="decimal"
        aria-label={`Previous reading for ${roomName}`}
        error={previousError}
        {...form.register(`previousReadings.${roomId}`)}
      />
      <div>
        <Input
          label="Current reading"
          inputMode="decimal"
          aria-label={`Current reading for ${roomName}`}
          error={currentError}
          {...form.register(`currentReadings.${roomId}`)}
        />
        {unitsLabel && <p className="mt-1 text-secondary text-ink-muted">{unitsLabel} used</p>}
      </div>
    </fieldset>
  );
}
