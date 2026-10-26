import { buildStatement, daysLate } from "@/features/charges/balance";
import type {
  Charge,
  ChargeType,
  MonthDetail,
  MonthlyIncomeRow,
  OutstandingRow,
  Payment,
  PaymentMethod,
  Room,
  StatementLine,
  Tenant,
  TenantBalance,
} from "@/types/domain";

const CHARGE_TYPES: ChargeType[] = ["rent", "electricity", "water", "other"];
const PAYMENT_METHODS: PaymentMethod[] = ["cash", "eft", "ewallet", "other"];

function parsePeriod(period: string): { year: number; month: number } {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period);
  if (!match) throw new Error(`Invalid period: ${period}`);
  return { year: Number(match[1]), month: Number(match[2]) };
}

export function previousMonths(currentMonth: string, count = 12): string[] {
  const { year, month } = parsePeriod(currentMonth);
  if (!Number.isInteger(count) || count < 1) throw new Error("Month count must be positive.");
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - index, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

export function buildMonthlyIncomeRows(
  currentMonth: string,
  charges: Charge[],
  payments: Payment[],
  count = 12,
): MonthlyIncomeRow[] {
  const months = previousMonths(currentMonth, count);
  const totals = new Map(months.map((month) => [month, { chargedCents: 0, receivedCents: 0 }]));
  for (const charge of charges) {
    const totalsForMonth = totals.get(charge.due_date.slice(0, 7));
    if (totalsForMonth) totalsForMonth.chargedCents += charge.amount_cents;
  }
  for (const payment of payments) {
    if (payment.status !== "confirmed") continue;
    const totalsForMonth = totals.get(payment.paid_on.slice(0, 7));
    if (totalsForMonth) totalsForMonth.receivedCents += payment.amount_cents;
  }
  return months.map((month) => ({
    month,
    ...(totals.get(month) ?? { chargedCents: 0, receivedCents: 0 }),
  }));
}

function emptyChargeTotals(): Record<ChargeType, number> {
  return { rent: 0, electricity: 0, water: 0, other: 0 };
}

function emptyPaymentTotals(): Record<PaymentMethod, number> {
  return { cash: 0, eft: 0, ewallet: 0, other: 0 };
}

export function buildMonthDetail(
  month: string,
  charges: Charge[],
  payments: Payment[],
  tenants: Tenant[],
  rooms: Room[],
): MonthDetail {
  parsePeriod(month);
  const tenantById = new Map(tenants.map((tenant) => [tenant.id, tenant]));
  const roomById = new Map(rooms.map((room) => [room.id, room]));
  const chargedByType = emptyChargeTotals();
  const receivedByMethod = emptyPaymentTotals();

  for (const charge of charges) {
    if (charge.due_date.slice(0, 7) === month) chargedByType[charge.type] += charge.amount_cents;
  }
  const monthlyPayments = payments.filter(
    (payment) => payment.status === "confirmed" && payment.paid_on.slice(0, 7) === month,
  );
  const paymentRows = monthlyPayments.map((payment) => {
    const tenant = tenantById.get(payment.tenant_id);
    const room = tenant ? roomById.get(tenant.room_id) : undefined;
    if (!tenant || !room) throw new Error("Payment report refers to a missing tenant or room.");
    receivedByMethod[payment.method] += payment.amount_cents;
    return {
      paymentId: payment.id,
      tenantId: payment.tenant_id,
      paidOn: payment.paid_on,
      tenantName: tenant.name,
      roomName: room.name,
      method: payment.method,
      amountCents: payment.amount_cents,
      receiptNumber: payment.receipt_number ?? "",
    };
  });
  paymentRows.sort(
    (left, right) =>
      left.paidOn.localeCompare(right.paidOn) || left.paymentId.localeCompare(right.paymentId),
  );
  return { month, chargedByType, receivedByMethod, payments: paymentRows };
}

export function buildOutstandingRows(
  balances: TenantBalance[],
  tenants: Tenant[],
  rooms: Room[],
  today: string,
): OutstandingRow[] {
  const tenantById = new Map(tenants.map((tenant) => [tenant.id, tenant]));
  const roomById = new Map(rooms.map((room) => [room.id, room]));
  return balances
    .flatMap((balance) => {
      if (balance.balanceCents <= 0) return [];
      const tenant = tenantById.get(balance.tenantId);
      const room = roomById.get(balance.roomId);
      if (!tenant || !room) return [];
      const lateDays = balance.overdueCents > 0 ? daysLate(balance.oldestUnpaidDueDate, today) : 0;
      return [
        {
          tenantId: tenant.id,
          tenantName: tenant.name,
          roomName: room.name,
          balanceCents: balance.balanceCents,
          daysLate: lateDays > 0 ? lateDays : null,
          isCurrent: tenant.move_out_date === null,
        },
      ];
    })
    .sort(
      (left, right) =>
        right.balanceCents - left.balanceCents || left.tenantName.localeCompare(right.tenantName),
    );
}

export function sumChargedByType(detail: MonthDetail): number {
  return CHARGE_TYPES.reduce((total, type) => total + detail.chargedByType[type], 0);
}

export function sumReceivedByMethod(detail: MonthDetail): number {
  return PAYMENT_METHODS.reduce((total, method) => total + detail.receivedByMethod[method], 0);
}

export function buildTenantStatementLines(charges: Charge[], payments: Payment[]): StatementLine[] {
  return buildStatement(charges, payments)
    .filter((line) => !line.isPending && !line.isVoided)
    .reverse();
}
