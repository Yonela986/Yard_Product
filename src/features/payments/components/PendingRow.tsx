import { Link } from "@tanstack/react-router";

import { InitialsTile } from "@/components/ui/InitialsTile";
import { RowAmount } from "@/components/ui/RowAmount";
import { formatShortDate } from "@/lib/dates";
import {
  PAYMENT_METHOD_LABELS,
  type PendingPaymentRow as PendingPaymentRowData,
} from "@/types/domain";
import { paths } from "@/router/paths";

export function PendingRow({ row }: { row: PendingPaymentRowData }) {
  return (
    <li>
      <Link
        to={paths.paymentDetail
          .replace("$tenantId", row.tenantId)
          .replace("$paymentId", row.paymentId)}
        className="flex min-h-16 items-center gap-3 px-4 py-2 text-left text-ink"
      >
        <InitialsTile name={row.tenantName} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body font-semibold">{row.tenantName}</span>
          <span className="truncate text-secondary text-ink-muted">
            {row.roomName} · {formatShortDate(row.paidOn)} · {PAYMENT_METHOD_LABELS[row.method]}
            {row.hasProof ? " · Proof attached" : ""}
          </span>
        </span>
        <RowAmount cents={row.amountCents} />
      </Link>
    </li>
  );
}
