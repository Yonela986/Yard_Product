import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import {
  editChargePayload,
  editChargeSchema,
  type EditChargeValues,
} from "@/features/charges/schema";
import type { Charge } from "@/types/domain";

interface EditChargeSheetProps {
  charge: Charge | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (charge: Charge, input: ReturnType<typeof editChargePayload>) => Promise<void>;
}

export function EditChargeSheet({ charge, open, onOpenChange, onSave }: EditChargeSheetProps) {
  const [values, setValues] = useState<EditChargeValues>({ amount: "", note: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && charge) {
      setValues({
        amount: String(charge.amount_cents / 100),
        note: charge.note ?? "",
      });
      setErrors({});
      setSubmitError("");
    }
  }, [open, charge]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!charge) return;
    const result = editChargeSchema.safeParse(values);
    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && nextErrors[key] === undefined)
          nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }
    setSaving(true);
    try {
      await onSave(charge, editChargePayload(result.data));
      onOpenChange(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Charge could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Edit charge"
      description="Use this to adjust a charge, for example when a tenant moves in part-way through a month."
    >
      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        <Input
          label="Amount"
          inputMode="decimal"
          prefix="R"
          value={values.amount}
          onChange={(event) => {
            setValues((current) => ({ ...current, amount: event.target.value }));
            setErrors((current) => ({ ...current, amount: "" }));
          }}
          error={errors["amount"]}
        />
        <Input
          label="Note"
          value={values.note}
          onChange={(event) => {
            setValues((current) => ({ ...current, note: event.target.value }));
            setErrors((current) => ({ ...current, note: "" }));
          }}
          error={errors["note"]}
        />
        {submitError && (
          <p role="alert" className="text-secondary font-semibold text-ink">
            {submitError}
          </p>
        )}
        <Button fullWidth type="submit" loading={saving} loadingLabel="Saving">
          Save charge
        </Button>
      </form>
    </Sheet>
  );
}
