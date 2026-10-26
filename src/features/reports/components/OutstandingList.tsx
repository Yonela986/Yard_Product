import { useNavigate } from "@tanstack/react-router";

import { InitialsTile } from "@/components/ui/InitialsTile";
import { ListCard, ListRow } from "@/components/ui/ListRow";
import { RowAmount } from "@/components/ui/RowAmount";
import { paths } from "@/router/paths";
import type { OutstandingRow } from "@/types/domain";

export function OutstandingList({ rows }: { rows: OutstandingRow[] }) {
  const navigate = useNavigate();
  if (rows.length === 0) {
    return <p className="text-secondary text-ink-muted">No tenants have a positive balance.</p>;
  }
  return (
    <ListCard>
      {rows.map((row) => (
        <ListRow
          key={row.tenantId}
          primary={row.tenantName}
          secondary={`${row.roomName} · ${
            !row.isCurrent
              ? "Moved out"
              : row.daysLate !== null
                ? `${row.daysLate} days late`
                : "Current"
          }`}
          leading={<InitialsTile name={row.tenantName} />}
          trailing={<RowAmount cents={row.balanceCents} />}
          chevron
          onClick={() =>
            void navigate({
              to: paths.tenantDetail.replace("$tenantId", row.tenantId),
            })
          }
        />
      ))}
    </ListCard>
  );
}
