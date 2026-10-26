import { useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/layout/PageHeader";
import { ListCard } from "@/components/ui/ListRow";
import { BillRow } from "@/features/utilities/components/BillRow";
import { useProperty } from "@/features/rooms/hooks";
import { useUtilityBills } from "@/features/utilities/hooks";
import { paths } from "@/router/paths";

export default function Utilities() {
  const navigate = useNavigate();
  const property = useProperty();
  const bills = useUtilityBills(property.data?.id ?? "");

  if (property.isPending || (property.data && bills.isPending)) {
    return (
      <>
        <PageHeader title="Utilities" backTo={paths.money} />
        <p className="py-6 text-body text-ink-muted">Loading utility bills...</p>
      </>
    );
  }
  if (property.isError || bills.isError || !property.data) {
    return (
      <>
        <PageHeader title="Utilities" backTo={paths.money} />
        <div className="space-y-3 py-6">
          <p role="alert" className="text-body text-ink">
            Utility bills could not be loaded. Check your connection and try again.
          </p>
          <Button
            variant="secondary"
            onClick={() => void Promise.all([property.refetch(), bills.refetch()])}
          >
            Try again
          </Button>
        </div>
      </>
    );
  }
  const rows = bills.data ?? [];
  return (
    <>
      <PageHeader
        title="Utilities"
        backTo={paths.money}
        action={<Button onClick={() => void navigate({ to: paths.utilityNew })}>Add a bill</Button>}
      />
      {rows.length === 0 ? (
        <p className="py-6 text-body text-ink">No utility bills yet. Add your first bill.</p>
      ) : (
        <ListCard>
          {rows.map((bill) => (
            <BillRow key={bill.id} bill={bill} />
          ))}
        </ListCard>
      )}
    </>
  );
}
