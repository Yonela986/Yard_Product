import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { voidPaymentSchema } from "@/features/payments/schema";

interface VoidSheetProps {
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onVoid: (reason: string) => Promise<void>;
}

export function VoidSheet({ open, saving, onOpenChange, onVoid }: VoidSheetProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = voidPaymentSchema.safeParse({ reason });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Enter a reason");
      return;
    }
    setError("");
    try {
      await onVoid(result.data.reason);
      setReason("");
      onOpenChange(false);
    } catch {
      setError("The payment could not be voided. Try again.");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Void payment">
      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        <p className="text-secondary text-ink">
          This removes the payment from the balance. The receipt number is kept and marked as
          voided.
        </p>
        <Input
          label="Reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          error={error}
        />
        <Button fullWidth type="submit" variant="secondary" loading={saving} loadingLabel="Voiding">
          Void payment
        </Button>
      </form>
    </Sheet>
  );
}
