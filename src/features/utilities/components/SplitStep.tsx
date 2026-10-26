import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { UtilityRoom } from "../api";
import type { UtilityBillFormValues } from "../schema";
import { ReadingFields } from "./ReadingFields";
import { formatMoney, toCents } from "@/lib/money";
import type { UseFormReturn } from "react-hook-form";

export function SplitStep({
  rooms,
  values,
  form,
}: {
  rooms: UtilityRoom[];
  values: UtilityBillFormValues;
  form: UseFormReturn<UtilityBillFormValues>;
}) {
  const occupied = rooms.filter((room) => room.tenantId && room.tenantName);
  const vacant = rooms.filter((room) => !room.tenantId);
  const selected = new Set(values.includedRoomIds);
  let leftCents: number | null = null;
  if (values.splitMethod === "custom") {
    const total = toCents(values.total);
    if (total.ok) {
      const used = values.includedRoomIds.reduce((sum, roomId) => {
        const amount = toCents(values.customAmounts[roomId] ?? "");
        return sum + (amount.ok ? amount.cents : 0);
      }, 0);
      leftCents = total.cents - used;
    }
  }

  function toggleRoom(roomId: string, isChecked: boolean) {
    const current = new Set(form.getValues("includedRoomIds"));
    if (isChecked) current.add(roomId);
    else current.delete(roomId);
    form.setValue("includedRoomIds", [...current], { shouldValidate: true, shouldDirty: true });
  }

  return (
    <section className="space-y-4">
      <Select
        label="How to split"
        options={[
          { value: "equal", label: "Split equally" },
          { value: "by_room", label: "By usage" },
          { value: "custom", label: "Custom amounts" },
        ]}
        {...form.register("splitMethod")}
      />
      <fieldset className="space-y-3">
        <legend className="text-body font-semibold text-ink">Rooms</legend>
        {occupied.map((room) => {
          const isChecked = selected.has(room.id);
          return (
            <div key={room.id} className="space-y-3 border-b border-line py-3">
              <label
                htmlFor={`utility-room-${room.id}`}
                aria-label={`${room.name} - ${room.tenantName}`}
                className="flex min-h-11 items-center gap-3 text-body text-ink"
              >
                <input
                  id={`utility-room-${room.id}`}
                  type="checkbox"
                  checked={isChecked}
                  onChange={(event) => toggleRoom(room.id, event.currentTarget.checked)}
                  className="size-5 accent-brand"
                />
                <span>
                  <span className="block font-semibold">{room.name}</span>
                  <span className="block text-secondary text-ink-muted">{room.tenantName}</span>
                </span>
              </label>
              {isChecked && values.splitMethod === "by_room" && (
                <ReadingFields
                  roomId={room.id}
                  roomName={room.name}
                  type={values.type}
                  form={form}
                  previousValue={values.previousReadings[room.id] ?? ""}
                  currentValue={values.currentReadings[room.id] ?? ""}
                />
              )}
              {isChecked && values.splitMethod === "custom" && (
                <Input
                  label={`Amount for ${room.name}`}
                  prefix="R"
                  inputMode="decimal"
                  {...form.register(`customAmounts.${room.id}`)}
                  error={form.formState.errors.customAmounts?.[room.id]?.message}
                />
              )}
            </div>
          );
        })}
        {vacant.map((room) => (
          <p key={room.id} className="py-2 text-secondary text-ink-muted">
            {room.name} · Vacant, not charged
          </p>
        ))}
        {form.formState.errors.includedRoomIds?.message && (
          <p role="alert" className="text-secondary font-semibold text-ink">
            {form.formState.errors.includedRoomIds.message}
          </p>
        )}
      </fieldset>
      <label
        htmlFor="include-main-house"
        className="flex min-h-12 items-start gap-3 text-body text-ink"
      >
        <input
          id="include-main-house"
          type="checkbox"
          className="mt-1 size-5 accent-brand"
          {...form.register("includeMainHouse")}
        />
        <span>Include the main house in the split. Its share is not charged to anyone.</span>
      </label>
      {values.splitMethod === "by_room" && values.includeMainHouse && (
        <Input
          label="Main house units"
          inputMode="decimal"
          {...form.register("mainHouseUnits")}
          error={form.formState.errors.mainHouseUnits?.message}
        />
      )}
      {values.splitMethod === "custom" && leftCents !== null && (
        <p className="text-body text-ink">
          Left for you: <span className="money font-semibold">{formatMoney(leftCents)}</span>
        </p>
      )}
      {form.formState.errors.total?.message && values.splitMethod === "custom" && (
        <p role="alert" className="text-secondary font-semibold text-ink">
          {form.formState.errors.total.message}
        </p>
      )}
    </section>
  );
}
