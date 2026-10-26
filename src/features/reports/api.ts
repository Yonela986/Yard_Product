import { previousMonths } from "./aggregate";

import { supabase } from "@/lib/supabase";
import { todayInSA } from "@/lib/dates";
import type { Charge, Payment, Room, Tenant, TenantBalance } from "@/types/domain";

const PAGE_SIZE = 1000;

type PageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

function nextPeriodStart(period: string): string {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period);
  if (!match) throw new Error("Choose a valid report month.");
  return new Date(Date.UTC(Number(match[1]), Number(match[2]), 1)).toISOString().slice(0, 10);
}

function reportRange(month: string): { start: string; end: string } {
  const months = previousMonths(month, 12);
  return { start: `${months[months.length - 1]}-01`, end: nextPeriodStart(month) };
}

export type IncomeReportData = {
  months: string[];
  charges: Charge[];
  payments: Payment[];
  balances: TenantBalance[];
  tenants: Tenant[];
  rooms: Room[];
};

export async function getIncomeReportData(): Promise<IncomeReportData> {
  const months = previousMonths(todayInSA().slice(0, 7), 12);
  const { start, end } = reportRange(months[0] ?? "");
  const [charges, payments, balances, tenants, rooms] = await Promise.all([
    fetchAllPages((from, to) =>
      supabase
        .from("charges")
        .select("*")
        .gte("due_date", start)
        .lt("due_date", end)
        .order("due_date", { ascending: true })
        .range(from, to),
    ),
    fetchAllPages((from, to) =>
      supabase
        .from("payments")
        .select("*")
        .eq("status", "confirmed")
        .gte("paid_on", start)
        .lt("paid_on", end)
        .order("paid_on", { ascending: true })
        .range(from, to),
    ),
    fetchAllPages((from, to) => supabase.from("tenant_balances").select("*").range(from, to)),
    fetchAllPages((from, to) => supabase.from("tenants").select("*").range(from, to)),
    fetchAllPages((from, to) => supabase.from("rooms").select("*").range(from, to)),
  ]);

  const tenantBalances: TenantBalance[] = balances.flatMap((row) =>
    row.tenant_id && row.room_id
      ? [
          {
            tenantId: row.tenant_id,
            roomId: row.room_id,
            chargedCents: Number(row.charged_cents ?? 0),
            paidCents: Number(row.paid_cents ?? 0),
            balanceCents: Number(row.balance_cents ?? 0),
            overdueCents: Number(row.overdue_cents ?? 0),
            paidThisMonthCents: Number(row.paid_this_month_cents ?? 0),
            oldestUnpaidDueDate: row.oldest_unpaid_due_date,
          },
        ]
      : [],
  );
  return {
    months,
    charges: charges as Charge[],
    payments: payments as Payment[],
    balances: tenantBalances,
    tenants: tenants as Tenant[],
    rooms: rooms as Room[],
  };
}

export type MonthReportData = Pick<
  IncomeReportData,
  "charges" | "payments" | "tenants" | "rooms" | "balances"
>;

export async function getMonthReportData(month: string): Promise<MonthReportData> {
  const start = `${month}-01`;
  const end = nextPeriodStart(month);
  const [charges, payments, balances, tenants, rooms] = await Promise.all([
    fetchAllPages((from, to) =>
      supabase
        .from("charges")
        .select("*")
        .gte("due_date", start)
        .lt("due_date", end)
        .order("due_date", { ascending: true })
        .range(from, to),
    ),
    fetchAllPages((from, to) =>
      supabase
        .from("payments")
        .select("*")
        .eq("status", "confirmed")
        .gte("paid_on", start)
        .lt("paid_on", end)
        .order("paid_on", { ascending: true })
        .range(from, to),
    ),
    fetchAllPages((from, to) => supabase.from("tenant_balances").select("*").range(from, to)),
    fetchAllPages((from, to) => supabase.from("tenants").select("*").range(from, to)),
    fetchAllPages((from, to) => supabase.from("rooms").select("*").range(from, to)),
  ]);
  const tenantBalances: TenantBalance[] = balances.flatMap((row) =>
    row.tenant_id && row.room_id
      ? [
          {
            tenantId: row.tenant_id,
            roomId: row.room_id,
            chargedCents: Number(row.charged_cents ?? 0),
            paidCents: Number(row.paid_cents ?? 0),
            balanceCents: Number(row.balance_cents ?? 0),
            overdueCents: Number(row.overdue_cents ?? 0),
            paidThisMonthCents: Number(row.paid_this_month_cents ?? 0),
            oldestUnpaidDueDate: row.oldest_unpaid_due_date,
          },
        ]
      : [],
  );
  return {
    charges: charges as Charge[],
    payments: payments as Payment[],
    balances: tenantBalances,
    tenants: tenants as Tenant[],
    rooms: rooms as Room[],
  };
}
