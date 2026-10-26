import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { formatShortDate, formatMonthLabel } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import {
  PAYMENT_METHOD_LABELS,
  type ChargeType,
  type MonthlyStatementData,
  type PaymentMethod,
  type StatementLine,
  type TenantStatementData,
} from "@/types/domain";

type StatementInput =
  | { kind: "monthly"; data: MonthlyStatementData; fileSuffix: string; label?: string }
  | { kind: "tenant"; data: TenantStatementData; fileSuffix: string; label?: string };

function canShareFiles(): boolean {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.share !== "function" ||
    typeof navigator.canShare !== "function" ||
    typeof File === "undefined"
  ) {
    return false;
  }
  try {
    return navigator.canShare({
      files: [new File([], "statement.pdf", { type: "application/pdf" })],
    });
  } catch {
    return false;
  }
}

function balanceText(balanceCents: number): string {
  if (balanceCents < 0) return `Credit ${formatMoney(Math.abs(balanceCents))}`;
  if (balanceCents > 0) return `Owing ${formatMoney(balanceCents)}`;
  return formatMoney(0);
}

const CHARGE_LABELS: Record<ChargeType, string> = {
  rent: "Rent",
  electricity: "Electricity",
  water: "Water",
  other: "Other",
};
const CHARGE_TYPES: ChargeType[] = ["rent", "electricity", "water", "other"];
const PAYMENT_METHODS: PaymentMethod[] = ["cash", "eft", "ewallet", "other"];

export function DownloadStatementButton({
  kind,
  data,
  fileSuffix,
  label = "View statement",
}: StatementInput) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const [error, setError] = useState("");
  const canShare = canShareFiles();
  const title = kind === "monthly" ? "Monthly statement" : "Tenant statement";
  const filePrefix = kind === "monthly" ? "monthly-statement" : "tenant-statement";

  async function createStatement(action: "download" | "share") {
    setBusy(action);
    setError("");
    try {
      const { createMonthlyStatementPdf, createTenantStatementPdf, statementFileName } =
        await import("@/features/reports/statementPdf");
      const blob =
        kind === "monthly"
          ? await createMonthlyStatementPdf(data)
          : await createTenantStatementPdf(data);
      const fileName = statementFileName(filePrefix, fileSuffix);
      if (action === "share" && canShare) {
        const file = new File([blob], fileName, { type: "application/pdf" });
        await navigator.share({ files: [file], title });
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError")) {
        setError("The statement could not be prepared. Try again.");
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="space-y-2">
        <Button
          variant="secondary"
          onClick={() => {
            setError("");
            setOpen(true);
          }}
        >
          {label}
        </Button>
        {error && (
          <p role="alert" className="text-secondary text-ink">
            {error}
          </p>
        )}
      </div>
      <Sheet open={open} onOpenChange={setOpen} title={title}>
        <div className="space-y-5">
          {kind === "monthly" ? <MonthlyPreview data={data} /> : <TenantPreview data={data} />}
          <div className="space-y-2 border-t border-line pt-4">
            <Button
              fullWidth
              variant="secondary"
              loading={busy === "download"}
              loadingLabel="Preparing PDF"
              onClick={() => void createStatement("download")}
            >
              Download PDF
            </Button>
            {canShare && (
              <>
                <Button
                  fullWidth
                  variant="secondary"
                  loading={busy === "share"}
                  loadingLabel="Preparing PDF"
                  onClick={() => void createStatement("share")}
                >
                  Share PDF
                </Button>
                <p className="text-secondary text-ink-muted">
                  Choose WhatsApp from the share options if it is available.
                </p>
              </>
            )}
            {error && (
              <p role="alert" className="text-secondary text-ink">
                {error}
              </p>
            )}
          </div>
        </div>
      </Sheet>
    </>
  );
}

function MonthlyPreview({ data }: { data: MonthlyStatementData }) {
  const chargedTotal = Object.values(data.detail.chargedByType).reduce(
    (sum, amount) => sum + amount,
    0,
  );
  const receivedTotal = Object.values(data.detail.receivedByMethod).reduce(
    (sum, amount) => sum + amount,
    0,
  );
  const outstandingTotal = data.outstanding.reduce((sum, row) => sum + row.balanceCents, 0);
  return (
    <div className="space-y-5">
      <section className="space-y-1">
        <p className="text-title font-semibold text-ink">{formatMonthLabel(data.month)}</p>
        <p className="text-body text-ink">{data.landlordName}</p>
        <p className="text-secondary text-ink-muted">{data.propertyName}</p>
        {data.propertyAddress && (
          <p className="text-secondary text-ink-muted">{data.propertyAddress}</p>
        )}
        <p className="text-secondary text-ink-muted">
          Generated {formatShortDate(data.generatedOn)}
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="text-body font-semibold text-ink">Charged by type</h3>
        {CHARGE_TYPES.map((type) => (
          <SummaryLine
            key={type}
            label={CHARGE_LABELS[type]}
            amountCents={data.detail.chargedByType[type]}
          />
        ))}
        <SummaryLine label="Total charged" amountCents={chargedTotal} emphasized />
      </section>
      <section className="space-y-2">
        <h3 className="text-body font-semibold text-ink">Received by method</h3>
        {PAYMENT_METHODS.map((method) => (
          <SummaryLine
            key={method}
            label={PAYMENT_METHOD_LABELS[method]}
            amountCents={data.detail.receivedByMethod[method]}
          />
        ))}
        <SummaryLine label="Total received" amountCents={receivedTotal} emphasized />
      </section>
      <section className="space-y-2">
        <h3 className="text-body font-semibold text-ink">Payments received</h3>
        {data.detail.payments.length === 0 ? (
          <p className="text-secondary text-ink-muted">No confirmed payments this month.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {data.detail.payments.map((payment) => (
              <li
                key={payment.paymentId}
                className="flex items-start justify-between gap-3 py-3 text-body text-ink"
              >
                <div className="min-w-0">
                  <p className="font-semibold">
                    {payment.tenantName} · {payment.roomName}
                  </p>
                  <p className="text-secondary text-ink-muted">
                    {formatShortDate(payment.paidOn)} · {PAYMENT_METHOD_LABELS[payment.method]}
                  </p>
                  <p className="text-secondary text-ink-muted">
                    Receipt {payment.receiptNumber || "Not available"}
                  </p>
                </div>
                <p className="shrink-0 money font-semibold">{formatMoney(payment.amountCents)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-2 border-t border-line pt-4">
        <h3 className="text-body font-semibold text-ink">Outstanding</h3>
        <SummaryLine label="Tenants with a balance" value={String(data.outstanding.length)} />
        <SummaryLine label="Total outstanding" amountCents={outstandingTotal} emphasized />
      </section>
    </div>
  );
}

function TenantPreview({ data }: { data: TenantStatementData }) {
  const lines = data.lines.filter((line) => !line.isPending && !line.isVoided);
  return (
    <div className="space-y-5">
      <section className="space-y-1">
        <p className="text-body font-semibold text-ink">{data.tenantName}</p>
        <p className="text-body text-ink">{data.roomName}</p>
        <p className="text-secondary text-ink-muted">{data.landlordName}</p>
        <p className="text-secondary text-ink-muted">{data.propertyName}</p>
        {data.propertyAddress && (
          <p className="text-secondary text-ink-muted">{data.propertyAddress}</p>
        )}
        <p className="text-secondary text-ink-muted">
          Generated {formatShortDate(data.generatedOn)}
        </p>
      </section>
      <section className="space-y-3">
        <h3 className="text-body font-semibold text-ink">Statement entries</h3>
        {lines.length === 0 ? (
          <p className="text-secondary text-ink-muted">No confirmed statement entries.</p>
        ) : (
          <ol className="divide-y divide-line border-y border-line">
            {lines.map((line) => (
              <TenantEntry key={`${line.kind}-${line.id}`} line={line} />
            ))}
          </ol>
        )}
      </section>
      <section className="border-t border-line pt-4">
        <SummaryLine
          label="Closing balance"
          value={balanceText(data.closingBalanceCents)}
          emphasized
        />
      </section>
    </div>
  );
}

function TenantEntry({ line }: { line: StatementLine }) {
  return (
    <li className="space-y-1 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body font-semibold text-ink">{line.description}</p>
          {line.note && <p className="text-secondary text-ink-muted">{line.note}</p>}
          <p className="text-secondary text-ink-muted">
            {line.kind === "charge" ? "Charge" : "Payment"} · {formatShortDate(line.date)}
          </p>
        </div>
        <p className="shrink-0 money text-body font-semibold text-ink">
          {formatMoney(Math.abs(line.amountCents))}
        </p>
      </div>
      <SummaryLine label="Balance" value={balanceText(line.runningBalanceCents)} />
    </li>
  );
}

type SummaryLineProps = { label: string; emphasized?: boolean } & (
  { value: string; amountCents?: never } | { amountCents: number; value?: never }
);

function SummaryLine(props: SummaryLineProps) {
  const value = "value" in props ? props.value : formatMoney(props.amountCents);
  return (
    <p
      className={`flex items-baseline justify-between gap-4 text-body text-ink ${props.emphasized ? "font-semibold" : ""}`}
    >
      <span className="text-ink-muted">{props.label}</span>
      <span className="text-right money">{value}</span>
    </p>
  );
}
