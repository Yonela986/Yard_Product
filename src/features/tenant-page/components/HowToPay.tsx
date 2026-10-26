import { useState } from "react";

import { Button } from "@/components/ui/Button";
import type { TenantPaymentInfo } from "@/types/domain";

export function HowToPay({ info }: { info: TenantPaymentInfo }) {
  const [copyStatus, setCopyStatus] = useState<"copied" | "error" | null>(null);
  const bankDetails = info.bankDetails?.trim() ?? "";

  async function copyDetails() {
    try {
      await navigator.clipboard.writeText(bankDetails);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }

  return (
    <section className="space-y-3 rounded-md border border-line bg-surface p-4">
      <h2 className="text-body font-semibold text-ink">How to pay</h2>
      {bankDetails ? (
        <>
          <p className="text-body break-words whitespace-pre-wrap text-ink">{bankDetails}</p>
          <p className="text-secondary text-ink-muted">
            Use {info.roomName} as your payment reference.
          </p>
          <Button variant="secondary" onClick={() => void copyDetails()}>
            Copy bank details
          </Button>
          {copyStatus === "copied" && (
            <p role="status" className="text-secondary text-ink">
              Bank details copied.
            </p>
          )}
          {copyStatus === "error" && (
            <p role="alert" className="text-secondary text-ink">
              Bank details could not be copied. Check your browser permissions.
            </p>
          )}
        </>
      ) : (
        <p className="text-body text-ink">Ask your landlord how to pay.</p>
      )}
    </section>
  );
}
