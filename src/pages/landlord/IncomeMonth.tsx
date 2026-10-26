import { Link, useParams } from "@tanstack/react-router";

import { PageHeader } from "@/components/layout/PageHeader";
import { DownloadStatementButton } from "@/features/reports/components/DownloadStatementButton";
import { MonthSummary } from "@/features/reports/components/MonthSummary";
import { buildMonthDetail, buildOutstandingRows } from "@/features/reports/aggregate";
import { useMonthReport } from "@/features/reports/hooks";
import { useLandlord } from "@/features/auth/hooks";
import { useProperty } from "@/features/rooms/hooks";
import { formatMoney } from "@/lib/money";
import { formatMonthLabel, formatShortDate, todayInSA } from "@/lib/dates";
import { paths } from "@/router/paths";
import { PAYMENT_METHOD_LABELS } from "@/types/domain";

export default function IncomeMonth() {
  const { month = "" } = useParams({ strict: false });
  const report = useMonthReport(month);
  const landlord = useLandlord();
  const property = useProperty();
  const validMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
  const data = report.data;

  return (
    <>
      <PageHeader
        title={validMonth ? formatMonthLabel(month) : "Monthly income"}
        backTo={paths.incomeReport}
      />
      {!validMonth ? (
        <p role="alert" className="py-6 text-body text-ink">
          Choose a valid report month.
        </p>
      ) : report.isPending || landlord.isPending || property.isPending ? (
        <p className="py-6 text-body text-ink-muted">Loading</p>
      ) : report.isError ||
        landlord.isError ||
        property.isError ||
        !data ||
        !landlord.data ||
        !property.data ? (
        <div className="space-y-3 py-6">
          <p role="alert" className="text-body text-ink">
            Could not load this. Check your connection.
          </p>
          <button
            type="button"
            className="min-h-11 underline"
            onClick={() => {
              void report.refetch();
              void landlord.refetch();
              void property.refetch();
            }}
          >
            Try again
          </button>
        </div>
      ) : (
        <MonthPageBody
          month={month}
          data={data}
          landlordName={landlord.data.name}
          propertyName={property.data.name}
          propertyAddress={property.data.address}
        />
      )}
    </>
  );
}

function MonthPageBody({
  month,
  data,
  landlordName,
  propertyName,
  propertyAddress,
}: {
  month: string;
  data: NonNullable<ReturnType<typeof useMonthReport>["data"]>;
  landlordName: string;
  propertyName: string;
  propertyAddress: string | null;
}) {
  const detail = buildMonthDetail(month, data.charges, data.payments, data.tenants, data.rooms);
  const outstanding = buildOutstandingRows(data.balances, data.tenants, data.rooms, todayInSA());
  const chargedTotal = Object.values(detail.chargedByType).reduce((sum, amount) => sum + amount, 0);
  const receivedTotal = Object.values(detail.receivedByMethod).reduce(
    (sum, amount) => sum + amount,
    0,
  );
  const statementData = {
    generatedOn: todayInSA(),
    landlordName,
    propertyName,
    propertyAddress,
    month,
    detail,
    outstanding,
  };

  return (
    <div className="space-y-6">
      <MonthSummary detail={detail} />
      <section className="space-y-1 border-t border-line pt-3">
        <p className="text-body text-ink">
          Total charged: <span className="money">{formatMoney(chargedTotal)}</span>
        </p>
        <p className="text-body text-ink">
          Total received: <span className="money">{formatMoney(receivedTotal)}</span>
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-body font-semibold text-ink">Payments received</h2>
        {detail.payments.length === 0 ? (
          <p className="text-secondary text-ink-muted">No confirmed payments for this month.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {detail.payments.map((payment) => (
              <li key={payment.paymentId}>
                <Link
                  to={paths.paymentDetail
                    .replace("$tenantId", payment.tenantId)
                    .replace("$paymentId", payment.paymentId)}
                  className="flex min-h-14 items-center justify-between gap-3 py-2 text-ink underline"
                >
                  <span className="min-w-0">
                    <span className="block truncate">
                      {payment.tenantName} · {payment.roomName}
                    </span>
                    <span className="block text-secondary text-ink-muted">
                      {formatShortDate(payment.paidOn)} · {PAYMENT_METHOD_LABELS[payment.method]}
                      {payment.receiptNumber ? ` · Receipt ${payment.receiptNumber}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 money">{formatMoney(payment.amountCents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <DownloadStatementButton
        kind="monthly"
        data={statementData}
        fileSuffix={month}
        label="View statement"
      />
    </div>
  );
}
