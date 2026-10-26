import { useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { InitialsTile } from "@/components/ui/InitialsTile";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ConfirmSheet } from "@/features/payments/components/ConfirmSheet";
import { DeclineSheet } from "@/features/payments/components/DeclineSheet";
import { MessageSheet } from "@/features/messaging/components/MessageSheet";
import { ProofViewer } from "@/features/payments/components/ProofViewer";
import { ReceiptActions, type ReceiptContext } from "@/features/payments/components/ReceiptActions";
import { VoidSheet } from "@/features/payments/components/VoidSheet";
import { PAYMENT_METHOD_LABELS, type Payment, type StatementLine } from "@/types/domain";
import { formatShortDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

interface PaymentDetailViewProps {
  payment: Payment;
  receiptContext: ReceiptContext | null;
  statement: StatementLine[];
  recorded: boolean;
  voidSheetOpen: boolean;
  voiding: boolean;
  onVoidSheetOpenChange: (open: boolean) => void;
  onVoid: (reason: string) => Promise<void>;
  confirming: boolean;
  declining: boolean;
  onConfirm: (input: {
    amountCents: number;
    paidOn: string;
    method: Payment["method"];
  }) => Promise<void>;
  onDecline: (reason: string) => Promise<void>;
}

function localDate(timestamp: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function PaymentDetailView({
  payment,
  receiptContext,
  statement,
  recorded,
  voidSheetOpen,
  voiding,
  onVoidSheetOpenChange,
  onVoid,
  confirming,
  declining,
  onConfirm,
  onDecline,
}: PaymentDetailViewProps) {
  const [receiptMessageOpen, setReceiptMessageOpen] = useState(false);
  const [confirmSheetOpen, setConfirmSheetOpen] = useState(false);
  const [declineSheetOpen, setDeclineSheetOpen] = useState(false);
  const line = statement.find((item) => item.kind === "payment" && item.id === payment.id);
  const isVoided = payment.status === "declined" && payment.voided_at !== null;
  const canManage = payment.status === "confirmed";
  const isWaitingTenantNotice =
    payment.created_by === "tenant" && payment.status === "pending_confirmation";
  return (
    <div className="space-y-6">
      {recorded && (
        <p role="status" className="text-body text-ink">
          Payment recorded.
        </p>
      )}
      {payment.created_by === "tenant" && payment.status === "confirmed" && (
        <p role="status" className="text-body text-ink">
          Payment confirmed. Receipt {payment.receipt_number ?? "not available"}.
        </p>
      )}
      <section className="space-y-3 rounded-md border border-line bg-surface p-4">
        <SectionHeader title="Payment details" />
        <div className="flex items-center gap-3 border-b border-line pb-3">
          <InitialsTile name={receiptContext?.tenant.name ?? "Payment"} size={48} />
          <div>
            <p className="text-secondary text-ink-muted">Amount</p>
            <p className="money text-figure font-semibold text-ink">
              {formatMoney(payment.amount_cents)}
            </p>
          </div>
        </div>
        {isWaitingTenantNotice && (
          <p className="border-b border-line pb-3 text-body font-semibold text-ink">
            Submitted by tenant on {formatShortDate(localDate(payment.created_at))}
          </p>
        )}
        <Detail label="Date paid">{formatShortDate(payment.paid_on)}</Detail>
        <Detail label="Method">{PAYMENT_METHOD_LABELS[payment.method]}</Detail>
        <Detail label="Receipt">{payment.receipt_number ?? "Not available"}</Detail>
        <Detail label="Recorded">{formatShortDate(localDate(payment.created_at))}</Detail>
        <Detail label="Balance after this payment">
          {line ? formatMoney(line.runningBalanceCents) : "Not available"}
        </Detail>
        {isVoided && payment.voided_at && (
          <div className="border-t border-line pt-3">
            <p className="text-body font-semibold text-ink">
              Voided on {formatShortDate(localDate(payment.voided_at))}
            </p>
            {payment.void_reason && (
              <p className="mt-1 text-secondary text-ink">{payment.void_reason}</p>
            )}
          </div>
        )}
        {payment.status === "declined" && !isVoided && (
          <div className="border-t border-line pt-3">
            <p className="text-body font-semibold text-ink">Not accepted</p>
            {payment.decline_reason && (
              <p className="mt-1 text-secondary text-ink">Reason: {payment.decline_reason}</p>
            )}
          </div>
        )}
      </section>
      {payment.proof_url && (
        <section className="space-y-2">
          <SectionHeader title="Proof" />
          <ProofViewer path={payment.proof_url} />
        </section>
      )}
      {canManage && (
        <>
          {receiptContext && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <ReceiptActions context={receiptContext} />
                <Button variant="secondary" onClick={() => setReceiptMessageOpen(true)}>
                  Send receipt on WhatsApp
                </Button>
              </div>
              <MessageSheet
                open={receiptMessageOpen}
                onOpenChange={setReceiptMessageOpen}
                mode={{
                  kind: "receipt",
                  tenant: receiptContext.tenant,
                  room: receiptContext.room,
                  payment: receiptContext.payment,
                }}
                landlord={receiptContext.landlord}
                accessToken={receiptContext.tenant.access_token}
              />
            </>
          )}
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-sm border border-line-strong bg-ground px-4 text-body font-semibold text-ink active:bg-line"
            onClick={() => onVoidSheetOpenChange(true)}
          >
            Void payment
          </button>
        </>
      )}
      {isWaitingTenantNotice && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setConfirmSheetOpen(true)}>Confirm payment</Button>
          <Button variant="secondary" onClick={() => setDeclineSheetOpen(true)}>
            Decline payment
          </Button>
        </div>
      )}
      <ConfirmSheet
        payment={payment}
        open={confirmSheetOpen}
        saving={confirming}
        onOpenChange={setConfirmSheetOpen}
        onConfirm={onConfirm}
      />
      <DeclineSheet
        open={declineSheetOpen}
        saving={declining}
        onOpenChange={setDeclineSheetOpen}
        onDecline={onDecline}
      />
      <VoidSheet
        open={voidSheetOpen}
        saving={voiding}
        onOpenChange={onVoidSheetOpenChange}
        onVoid={onVoid}
      />
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p className="flex items-baseline justify-between gap-4 text-body text-ink">
      <span className="text-ink-muted">{label}</span>
      <span className="text-right font-semibold">{children}</span>
    </p>
  );
}
