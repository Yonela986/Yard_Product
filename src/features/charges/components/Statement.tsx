import { useState } from "react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/Button";
import { EditChargeSheet } from "@/features/charges/components/EditChargeSheet";
import { buildStatement } from "@/features/charges/balance";
import { useUpdateCharge } from "@/features/charges/hooks";
import { formatShortDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { paths } from "@/router/paths";
import type { Charge, Payment } from "@/types/domain";

interface StatementProps {
  charges: Charge[];
  payments: Payment[];
  readOnly: boolean;
}

export function Statement({ charges, payments, readOnly }: StatementProps) {
  const [editingCharge, setEditingCharge] = useState<Charge | null>(null);
  const updateCharge = useUpdateCharge();
  const lines = buildStatement(charges, payments);

  async function saveCharge(charge: Charge, input: { amount_cents: number; note: string | null }) {
    await updateCharge.mutateAsync({ chargeId: charge.id, input });
  }

  if (lines.length === 0) {
    return <p className="text-secondary text-ink-muted">No statement entries yet.</p>;
  }

  return (
    <>
      <ul className="divide-y divide-line border-y border-line">
        {lines.map((line) => {
          const charge =
            line.kind === "charge" ? charges.find((item) => item.id === line.id) : null;
          const payment =
            line.kind === "payment" ? payments.find((item) => item.id === line.id) : null;
          return (
            <li key={line.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {payment ? (
                    <Link
                      className="text-body text-ink underline"
                      to={paths.paymentDetail
                        .replace("$tenantId", payment.tenant_id)
                        .replace("$paymentId", payment.id)}
                    >
                      {line.description}
                    </Link>
                  ) : (
                    <p className="text-body text-ink">{line.description}</p>
                  )}
                  <p className="text-secondary text-ink-muted">
                    {formatShortDate(line.date)}
                    {line.isPending ? " · Pending" : ""}
                    {line.isVoided ? " · Voided" : ""}
                  </p>
                  {line.note && <p className="mt-1 text-secondary text-ink">{line.note}</p>}
                </div>
                <div className="shrink-0 text-right">
                  <p className="money text-body text-ink">
                    {line.amountCents < 0
                      ? `−${formatMoney(Math.abs(line.amountCents))}`
                      : formatMoney(line.amountCents)}
                  </p>
                  <p className="text-secondary text-ink-muted">
                    Balance {formatMoney(line.runningBalanceCents)}
                  </p>
                </div>
              </div>
              {charge && !readOnly && (
                <Button
                  variant="quiet"
                  className="mt-1 min-h-11 px-2"
                  onClick={() => setEditingCharge(charge)}
                >
                  Edit
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      <EditChargeSheet
        charge={editingCharge}
        open={editingCharge !== null}
        onOpenChange={(open) => {
          if (!open) setEditingCharge(null);
        }}
        onSave={saveCharge}
      />
    </>
  );
}
