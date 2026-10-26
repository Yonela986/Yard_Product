import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { buildReceiptData } from "@/features/payments/receipt";
import { formatShortDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { PAYMENT_METHOD_LABELS } from "@/types/domain";
import type {
  Landlord,
  Payment,
  Property,
  ReceiptData,
  Room,
  StatementLine,
  Tenant,
} from "@/types/domain";

export interface ReceiptContext {
  payment: Payment;
  tenant: Tenant;
  room: Room;
  property: Property;
  landlord: Landlord;
  statement: StatementLine[];
}

function canShareFiles(): boolean {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.share !== "function" ||
    typeof navigator.canShare !== "function" ||
    typeof File === "undefined"
  ) {
    return false;
  }
  try {
    return navigator.canShare({
      files: [new File([], "receipt.pdf", { type: "application/pdf" })],
    });
  } catch {
    return false;
  }
}

function balanceText(balanceCents: number): string {
  if (balanceCents < 0) return `Credit ${formatMoney(Math.abs(balanceCents))}`;
  if (balanceCents > 0) return `Owing ${formatMoney(balanceCents)}`;
  return formatMoney(0);
}

export function ReceiptActions({ context }: { context: ReceiptContext }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ReceiptData | null>(null);
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const [error, setError] = useState("");
  const canShare = canShareFiles();

  function showReceipt() {
    try {
      setData(
        buildReceiptData(
          context.payment,
          context.tenant,
          context.room,
          context.property,
          context.landlord,
          context.statement,
        ),
      );
      setError("");
      setOpen(true);
    } catch {
      setError("The receipt details could not be loaded.");
    }
  }

  async function makeReceipt(action: "download" | "share") {
    if (!data) return;
    setBusy(action);
    setError("");
    try {
      const { createReceiptPdf, receiptFileName } = await import("@/features/payments/receipt");
      const fileName = receiptFileName(data.receiptNumber);
      const blob = await createReceiptPdf(data);
      if (action === "share" && canShare) {
        const file = new File([blob], fileName, { type: "application/pdf" });
        await navigator.share({ files: [file], title: "Receipt" });
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError")) {
        setError("The receipt could not be prepared. Try again.");
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="space-y-2">
        <Button variant="secondary" onClick={showReceipt}>
          View receipt
        </Button>
        {error && !open && (
          <p role="alert" className="text-secondary text-ink">
            {error}
          </p>
        )}
      </div>
      <Sheet open={open} onOpenChange={setOpen} title="Payment receipt">
        {data && (
          <div className="space-y-5">
            <div className="space-y-1 border-b border-line pb-4">
              <p className="text-title font-semibold text-ink">Receipt</p>
              <p className="text-body font-semibold text-ink">{data.receiptNumber}</p>
              <p className="text-secondary text-ink-muted">
                Issued {formatShortDate(data.issuedOn)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-body text-ink">
              <div className="space-y-1">
                <p className="font-semibold">From</p>
                <p>{data.landlordName}</p>
                <p>{data.landlordPhone}</p>
                <p>{data.propertyName}</p>
                {data.propertyAddress && <p>{data.propertyAddress}</p>}
              </div>
              <div className="space-y-1">
                <p className="font-semibold">To</p>
                <p>{data.tenantName}</p>
                <p>{data.roomName}</p>
              </div>
            </div>
            <div className="space-y-3 border-y border-line py-4">
              <ReceiptLine label="Amount received" value={formatMoney(data.amountCents)} />
              <ReceiptLine label="Date paid" value={formatShortDate(data.paidOn)} />
              <ReceiptLine
                label="Balance after this payment"
                value={balanceText(data.balanceAfterCents)}
              />
              <ReceiptLine label="Payment method" value={PAYMENT_METHOD_LABELS[data.method]} />
            </div>
            <div className="space-y-2">
              <Button
                fullWidth
                variant="secondary"
                loading={busy === "download"}
                loadingLabel="Preparing PDF"
                onClick={() => void makeReceipt("download")}
              >
                Download PDF
              </Button>
              {canShare && (
                <>
                  <Button
                    fullWidth
                    variant="secondary"
                    loading={busy === "share"}
                    loadingLabel="Preparing PDF"
                    onClick={() => void makeReceipt("share")}
                  >
                    Share PDF
                  </Button>
                  <p className="text-secondary text-ink-muted">
                    Choose WhatsApp from the share options if it is available.
                  </p>
                </>
              )}
              {error && (
                <p role="alert" className="text-secondary text-ink">
                  {error}
                </p>
              )}
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}

function ReceiptLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-baseline justify-between gap-4 text-body text-ink">
      <span className="text-ink-muted">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </p>
  );
}
