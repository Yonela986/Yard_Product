import { useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

import {
  emptyRoom,
  findDuplicateRoomIndexes,
  generateRooms,
  type OnboardingFormValues,
} from "../schema";
import { ReviewLine } from "./ReviewLine";

const DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

function BulkAdd({
  onAdd,
  onCancel,
}: {
  onAdd: (count: number, rent: string, day: string) => void;
  onCancel: () => void;
}) {
  const [count, setCount] = useState("");
  const [rent, setRent] = useState("");
  const [day, setDay] = useState("1");
  const [error, setError] = useState<string>();

  function add() {
    const n = Number(count);
    if (!Number.isInteger(n) || n < 1 || n > 50) {
      setError("Enter a number of rooms from 1 to 50");
      return;
    }
    onAdd(n, rent, day);
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border border-line bg-surface p-4">
      <p className="text-body font-semibold text-ink">Add several rooms at once</p>
      <Input
        label="How many rooms"
        inputMode="numeric"
        value={count}
        onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))}
        error={error}
      />
      <Input
        label="Monthly rent for each"
        prefix="R"
        inputMode="decimal"
        value={rent}
        onChange={(e) => setRent(e.target.value)}
      />
      <Select
        label="Due day"
        options={DAY_OPTIONS}
        value={day}
        onChange={(e) => setDay(e.target.value)}
      />
      <div className="flex gap-2">
        <Button onClick={add}>Add rooms</Button>
        <Button variant="quiet" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function RoomsStep() {
  const { control, register, formState, getValues } = useFormContext<OnboardingFormValues>();
  const { fields, append, remove, replace } = useFieldArray({ control, name: "rooms" });
  const rooms = useWatch({ control, name: "rooms" });
  const duplicates = findDuplicateRoomIndexes(rooms.map((r) => r.name));
  const [bulkOpen, setBulkOpen] = useState(false);

  function bulkAdd(count: number, rent: string, day: string) {
    const current = getValues("rooms");
    const onlyBlank =
      current.length === 1 && current[0]?.name.trim() === "" && current[0].rent.trim() === "";
    if (onlyBlank) replace(generateRooms(count, rent, day, 1));
    else append(generateRooms(count, rent, day, current.length + 1));
    setBulkOpen(false);
  }

  const listError = formState.errors.rooms?.root?.message ?? formState.errors.rooms?.message;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-body font-semibold text-ink">Rooms</h2>
      <ul className="flex flex-col divide-y divide-line border-y border-line">
        {fields.map((field, i) => {
          const err = formState.errors.rooms?.[i];
          return (
            <li key={field.id} className="flex flex-col gap-3 py-4">
              <Input
                label={`Room name`}
                error={err?.name?.message}
                helper={duplicates.has(i) ? "Another room has the same name" : undefined}
                {...register(`rooms.${i}.name`)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Monthly rent"
                  prefix="R"
                  inputMode="decimal"
                  error={err?.rent?.message}
                  {...register(`rooms.${i}.rent`)}
                />
                <Select
                  label="Due day"
                  options={DAY_OPTIONS}
                  error={err?.dueDay?.message}
                  {...register(`rooms.${i}.dueDay`)}
                />
              </div>
              {fields.length > 1 && (
                <Button variant="quiet" className="w-fit px-0" onClick={() => remove(i)}>
                  Remove
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {listError && <p className="text-secondary font-semibold text-ink">{listError}</p>}
      {bulkOpen ? (
        <BulkAdd onAdd={bulkAdd} onCancel={() => setBulkOpen(false)} />
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => append(emptyRoom())}
            disabled={fields.length >= 50}
          >
            Add a room
          </Button>
          <Button variant="secondary" onClick={() => setBulkOpen(true)}>
            Add several rooms at once
          </Button>
        </div>
      )}
      <ReviewLine rooms={rooms} />
    </div>
  );
}
