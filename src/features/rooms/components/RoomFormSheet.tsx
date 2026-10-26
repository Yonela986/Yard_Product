import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import {
  hasDuplicateRoomName,
  roomFormPayload,
  roomFormSchema,
  type RoomFormValues,
} from "@/features/rooms/schema";
import { formatMoney } from "@/lib/money";
import type { Room } from "@/types/domain";

interface RoomFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room?: Room | null;
  allRooms: Room[];
  onSave: (values: ReturnType<typeof roomFormPayload>) => Promise<void>;
}

const dueDayOptions = Array.from({ length: 28 }, (_, index) => ({
  value: String(index + 1),
  label: String(index + 1),
}));

function valuesFromRoom(room?: Room | null): RoomFormValues {
  return room
    ? {
        name: room.name,
        rent: String(room.monthly_rent_cents / 100),
        dueDay: String(room.due_day),
      }
    : { name: "", rent: "", dueDay: "1" };
}

export function RoomFormSheet({
  open,
  onOpenChange,
  room = null,
  allRooms,
  onSave,
}: RoomFormSheetProps) {
  const [values, setValues] = useState<RoomFormValues>(valuesFromRoom(room));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(valuesFromRoom(room));
      setErrors({});
      setSubmitError("");
    }
  }, [open, room]);

  function updateField<K extends keyof RoomFormValues>(field: K, value: RoomFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setSubmitError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = roomFormSchema.safeParse(values);
    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && nextErrors[field] === undefined) {
          nextErrors[field] = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    if (
      hasDuplicateRoomName(
        allRooms
          .filter((candidate) => candidate.id !== room?.id)
          .map((candidate) => candidate.name)
          .concat(result.data.name),
      )
    ) {
      setErrors({ name: "A room with this name already exists" });
      return;
    }

    setSaving(true);
    try {
      await onSave(roomFormPayload(result.data));
      onOpenChange(false);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Room could not be saved. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={room ? `Edit ${room.name}` : "Add room"}
      description="Enter the room name, monthly rent and rent due day."
    >
      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        <Input
          label="Room name"
          autoComplete="off"
          value={values.name}
          onChange={(event) => updateField("name", event.target.value)}
          error={errors["name"]}
        />
        <Input
          label="Monthly rent"
          inputMode="decimal"
          prefix="R"
          value={values.rent}
          onChange={(event) => updateField("rent", event.target.value)}
          error={errors["rent"]}
        />
        <Select
          label="Rent due day"
          value={values.dueDay}
          onChange={(event) => updateField("dueDay", event.target.value)}
          options={dueDayOptions}
          error={errors["dueDay"]}
        />
        {room && (
          <p className="text-secondary text-ink-muted">
            Current rent: {formatMoney(room.monthly_rent_cents)}
          </p>
        )}
        {submitError && (
          <p role="alert" className="text-secondary font-semibold text-ink">
            {submitError}
          </p>
        )}
        <Button fullWidth type="submit" loading={saving} loadingLabel="Saving">
          Save room
        </Button>
      </form>
    </Sheet>
  );
}
