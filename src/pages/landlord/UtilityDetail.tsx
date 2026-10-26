import { useParams } from "@tanstack/react-router";
import { useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/layout/PageHeader";
import { UndoSheet } from "@/features/utilities/components/UndoSheet";
import { useUndoUtilityBill, useUtilityBill } from "@/features/utilities/hooks";
import { canUndo, fromMilliUnits, toMilliUnits } from "@/features/utilities/split";
import { formatMonthLabel, formatShortDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { paths } from "@/router/paths";
import { SPLIT_METHOD_LABELS, UTILITY_LABELS, UTILITY_UNITS } from "@/types/domain";

export default function UtilityDetail() {
  const { billId = "" } = useParams({ strict: false });
  const [undoOpen, setUndoOpen] = useState(false);
  const query = useUtilityBill(billId);
  const bill = query.data?.bill;
  const undo = useUndoUtilityBill(bill?.property_id ?? "", billId);

  if (query.isPending) {
    return (
      <>
        <PageHeader title="Utility bill" backTo={paths.utilityList} />
        <p className="py-6 text-body text-ink-muted">Loading bill...</p>
      </>
    );
  }
  if (query.isError || !query.data || !bill) {
    return (
      <>
        <PageHeader title="Utility bill" backTo={paths.utilityList} />
        <p role="alert" className="py-6 text-body text-ink">
          Utility bill could not be loaded. Check your connection and try again.
        </p>
      </>
    );
  }
  const allowUndo = bill.voided_at === null && canUndo(bill.created_at);
  return (
    <>
      <PageHeader
        title={`${UTILITY_LABELS[bill.type]}, ${formatMonthLabel(bill.period)}`}
        backTo={paths.utilityList}
      />
      {bill.voided_at ? (
        <p className="mb-4 text-body text-ink">
          Undone on {formatShortDate(bill.voided_at.slice(0, 10))}
        </p>
      ) : (
        <p className="mb-4 text-body text-ink">Charges added.</p>
      )}
      <section className="space-y-3 rounded-md border border-line bg-surface p-4">
        <DetailLine label="Total">{formatMoney(bill.total_cents)}</DetailLine>
        <DetailLine label="Split">{SPLIT_METHOD_LABELS[bill.split_method]}</DetailLine>
        <DetailLine label="Charges due on">{formatShortDate(bill.due_date)}</DetailLine>
        <DetailLine label="Added">{formatShortDate(bill.created_at.slice(0, 10))}</DetailLine>
        {(bill.includes_main_house || bill.main_house_cents > 0) && (
          <DetailLine label="Main house (not charged)">
            {formatMoney(bill.main_house_cents)}
          </DetailLine>
        )}
      </section>
      <h2 className="mt-5 mb-2 text-body font-semibold text-ink">Room shares</h2>
      <ul className="divide-y divide-line border-y border-line">
        {query.data.shares.map((share) => (
          <li key={share.tenantId} className="space-y-1 py-3">
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-body font-semibold text-ink">
                  {share.roomName} · {share.tenantName}
                </span>
                {share.unitsMilli !== null && (
                  <span className="block text-secondary text-ink-muted">
                    {fromMilliUnits(share.unitsMilli)} {UTILITY_UNITS[bill.type]} used
                  </span>
                )}
                {bill.split_method === "by_room" &&
                  share.previousReading !== null &&
                  share.currentReading !== null && (
                    <span className="block text-secondary text-ink-muted">
                      Previous {fromMilliUnits(toMilliUnits(String(share.previousReading)))} ·
                      Current {fromMilliUnits(toMilliUnits(String(share.currentReading)))}
                    </span>
                  )}
                {share.currentAmountCents !== null &&
                  share.currentAmountCents !== share.amountCents && (
                    <span className="block text-secondary text-ink">Edited</span>
                  )}
                {bill.voided_at && (
                  <span className="block text-secondary text-ink-muted">Charge removed</span>
                )}
              </span>
              <span className="shrink-0 money text-body text-ink">
                {formatMoney(share.currentAmountCents ?? share.amountCents)}
              </span>
            </div>
          </li>
        ))}
      </ul>
      {allowUndo ? (
        <div className="mt-5 space-y-3">
          <Button variant="secondary" onClick={() => setUndoOpen(true)}>
            Undo this bill
          </Button>
          <UndoSheet
            open={undoOpen}
            saving={undo.isPending}
            onOpenChange={setUndoOpen}
            onUndo={() => undo.mutateAsync(bill.id)}
          />
        </div>
      ) : (
        bill.voided_at === null && (
          <p className="mt-4 text-secondary text-ink-muted">
            To correct a charge, edit it on the tenant’s statement.
          </p>
        )
      )}
    </>
  );
}

function DetailLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p className="flex justify-between gap-4 text-body text-ink">
      <span className="text-ink-muted">{label}</span>
      <span className="text-right font-semibold">{children}</span>
    </p>
  );
}
