import { Link } from "@tanstack/react-router";

import { LedgerTable, LedgerTd, LedgerTh } from "@/components/ui/LedgerTable";
import { formatMoney } from "@/lib/money";
import { formatMonthLabel } from "@/lib/dates";
import { paths } from "@/router/paths";
import type { MonthlyIncomeRow } from "@/types/domain";

export function MonthTable({ rows }: { rows: MonthlyIncomeRow[] }) {
  return (
    <div className="overflow-x-auto">
      <LedgerTable caption="Monthly income by month">
        <thead>
          <tr>
            <LedgerTh>Month</LedgerTh>
            <LedgerTh numeric>Charged</LedgerTh>
            <LedgerTh numeric>Received</LedgerTh>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.month}>
              <LedgerTd>
                <Link
                  className="inline-flex min-h-11 items-center text-ink underline"
                  to={paths.incomeMonth.replace("$month", row.month)}
                >
                  {formatMonthLabel(row.month)}
                </Link>
              </LedgerTd>
              <LedgerTd numeric>{formatMoney(row.chargedCents)}</LedgerTd>
              <LedgerTd numeric>{formatMoney(row.receivedCents)}</LedgerTd>
            </tr>
          ))}
        </tbody>
      </LedgerTable>
    </div>
  );
}
