import { Link } from "@tanstack/react-router";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { ListCard } from "@/components/ui/ListRow";
import { PendingRow } from "@/features/payments/components/PendingRow";
import { usePendingPayments } from "@/features/payments/hooks";
import { paths } from "@/router/paths";

export default function PendingPayments() {
  const pending = usePendingPayments();

  if (pending.isPending) {
    return (
      <>
        <PageHeader title="Payments waiting" backTo={paths.home} />
        <p className="py-6 text-body text-ink-muted">
          Loading payments waiting for confirmation...
        </p>
      </>
    );
  }
  if (pending.isError) {
    return (
      <>
        <PageHeader title="Payments waiting" backTo={paths.home} />
        <div className="space-y-3 py-6">
          <p role="alert" className="text-body text-ink">
            Waiting payments could not be loaded. Check your connection and try again.
          </p>
          <Button variant="secondary" onClick={() => void pending.refetch()}>
            Try again
          </Button>
        </div>
      </>
    );
  }
  return (
    <>
      <PageHeader title="Payments waiting" backTo={paths.home} />
      {pending.data.length === 0 ? (
        <p className="py-6 text-body text-ink">Nothing waiting.</p>
      ) : (
        <ListCard>
          {pending.data.map((row) => (
            <PendingRow key={row.paymentId} row={row} />
          ))}
        </ListCard>
      )}
      <Link
        className="mt-5 inline-flex min-h-11 items-center text-body text-ink underline"
        to={paths.money}
      >
        View payments
      </Link>
    </>
  );
}
