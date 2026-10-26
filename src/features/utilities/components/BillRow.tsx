import { useNavigate } from "@tanstack/react-router";
import { Droplets } from "lucide-react";

import { IconTile } from "@/components/ui/IconTile";
import { ListRow } from "@/components/ui/ListRow";
import { RowAmount } from "@/components/ui/RowAmount";
import { formatMonthLabel, formatShortDate } from "@/lib/dates";
import { paths } from "@/router/paths";
import { SPLIT_METHOD_LABELS, UTILITY_LABELS, type UtilityBill } from "@/types/domain";

function splitLabel(bill: UtilityBill): string {
  if (bill.split_method !== "equal") return SPLIT_METHOD_LABELS[bill.split_method];
  const roomCount = bill.shares.length;
  return `Split equally between ${roomCount} ${roomCount === 1 ? "room" : "rooms"}${
    bill.includes_main_house ? " and the main house" : ""
  }`;
}

export function BillRow({ bill }: { bill: UtilityBill }) {
  const navigate = useNavigate();
  return (
    <ListRow
      primary={`${UTILITY_LABELS[bill.type]}, ${formatMonthLabel(bill.period)}`}
      secondary={`${splitLabel(bill)} · ${bill.voided_at ? "Undone" : `Added ${formatShortDate(bill.created_at.slice(0, 10))}`}`}
      leading={<IconTile icon={Droplets} />}
      trailing={<RowAmount cents={bill.total_cents} />}
      chevron
      onClick={() => void navigate({ to: paths.utilityDetail.replace("$billId", bill.id) })}
    />
  );
}
