import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

export function UndoSheet({
  open,
  saving,
  onOpenChange,
  onUndo,
}: {
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onUndo: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  async function confirm() {
    setError("");
    try {
      await onUndo();
      onOpenChange(false);
    } catch {
      setError("The bill could not be undone. Check your connection and try again.");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Undo this bill">
      <div className="space-y-4">
        <p className="text-body text-ink">
          This removes the charges added to tenants. Use this only if the bill was entered wrongly.
        </p>
        {error && (
          <p role="alert" className="text-secondary font-semibold text-ink">
            {error}
          </p>
        )}
        <Button
          fullWidth
          variant="secondary"
          loading={saving}
          loadingLabel="Undoing"
          onClick={() => void confirm()}
        >
          Undo bill
        </Button>
        <Button fullWidth variant="quiet" onClick={() => onOpenChange(false)}>
          Keep bill
        </Button>
      </div>
    </Sheet>
  );
}
