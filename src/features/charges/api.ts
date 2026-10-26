import { supabase } from "@/lib/supabase";
import type { Charge, Payment, TenantBalance } from "@/types/domain";

function nextPeriodStart(period: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) throw new Error(`Invalid period: ${period}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) throw new Error(`Invalid period: ${period}`);
  const next = new Date(Date.UTC(year, month, 1));
  return next.toISOString().slice(0, 10);
}

export async function listTenantBalances(): Promise<TenantBalance[]> {
  const { data, error } = await supabase.from("tenant_balances").select("*");
  if (error) throw error;
  return (data ?? [])
    .filter((row) => row.tenant_id !== null && row.room_id !== null)
    .map((row) => ({
      tenantId: row.tenant_id as string,
      roomId: row.room_id as string,
      chargedCents: Number(row.charged_cents ?? 0),
      paidCents: Number(row.paid_cents ?? 0),
      balanceCents: Number(row.balance_cents ?? 0),
      overdueCents: Number(row.overdue_cents ?? 0),
      paidThisMonthCents: Number(row.paid_this_month_cents ?? 0),
      oldestUnpaidDueDate: row.oldest_unpaid_due_date,
    }));
}

export async function listMonthCharges(period: string): Promise<Charge[]> {
  const { data, error } = await supabase
    .from("charges")
    .select("*")
    .gte("due_date", `${period}-01`)
    .lt("due_date", nextPeriodStart(period))
    .order("due_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Charge[];
}

export async function listTenantCharges(tenantId: string): Promise<Charge[]> {
  const { data, error } = await supabase
    .from("charges")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("due_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Charge[];
}

export async function updateCharge(
  chargeId: string,
  input: Pick<Charge, "amount_cents" | "note">,
): Promise<Charge> {
  const { data, error } = await supabase
    .from("charges")
    .update(input)
    .eq("id", chargeId)
    .select()
    .single();
  if (error) throw error;
  return data as Charge;
}

export async function listPeriodPayments(period: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .gte("paid_on", `${period}-01`)
    .lt("paid_on", nextPeriodStart(period));
  if (error) throw error;
  return (data ?? []) as Payment[];
}

export async function generateRentCharges(): Promise<number> {
  const { data, error } = await supabase.rpc("generate_rent_charges");
  if (error) throw error;
  if (typeof data !== "number" || !Number.isInteger(data) || data < 0) {
    throw new Error("Rent charge generation returned an invalid result");
  }
  return data;
}
