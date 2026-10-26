import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { declinePendingPaymentSchema } from "@/features/payments/schema";

export function DeclineSheet({
  open,
  saving,
  onOpenChange,
  onDecline,
}: {
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onDecline: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = declinePendingPaymentSchema.safeParse({ reason });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Check the reason.");
      return;
    }
    setError("");
    try {
      await onDecline(result.data.reason);
      setReason("");
      onOpenChange(false);
    } catch {
      setError("The payment could not be declined. Refresh and try again.");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Decline payment">
      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        <p className="text-secondary text-ink-muted">
          The tenant will see that you did not accept this and can contact you.
        </p>
        <Input
          label="Reason (optional)"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          error={error}
        />
        <Button
          fullWidth
          type="submit"
          variant="secondary"
          loading={saving}
          loadingLabel="Declining"
        >
          Decline payment
        </Button>
      </form>
    </Sheet>
  );
}
