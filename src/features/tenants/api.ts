import { supabase } from "@/lib/supabase";
import type { PaymentMethod, RentStatus, Tenant } from "@/types/domain";

export async function listCurrentTenants(): Promise<Tenant[]> {
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .is("move_out_date", null)
    .order("move_in_date", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Tenant[];
}

export async function listPreviousTenantsForRoom(roomId: string): Promise<Tenant[]> {
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("room_id", roomId)
    .not("move_out_date", "is", null)
    .order("move_out_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Tenant[];
}

export async function listTenantsForRoom(roomId: string): Promise<Tenant[]> {
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("room_id", roomId)
    .order("move_in_date", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Tenant[];
}

export async function getTenant(tenantId: string): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Tenant | null;
}

export async function createTenant(input: {
  room_id: string;
  name: string;
  phone: string;
  language: string;
  move_in_date: string;
  deposit_cents: number;
  access_token: string;
}) {
  const { data, error } = await supabase.from("tenants").insert(input).select().single();
  if (error) throw error;
  return data as Tenant;
}

export async function updateTenant(tenantId: string, input: Partial<Tenant>) {
  const { data, error } = await supabase
    .from("tenants")
    .update(input)
    .eq("id", tenantId)
    .select()
    .single();
  if (error) throw error;
  return data as Tenant;
}

export async function moveOutTenant(tenantId: string, moveOutDate: string) {
  const { data, error } = await supabase
    .from("tenants")
    .update({ move_out_date: moveOutDate })
    .eq("id", tenantId)
    .select()
    .single();

  if (error) throw error;
  return data as Tenant;
}

export async function regenerateTenantToken(tenantId: string): Promise<string> {
  const { data, error } = await supabase.rpc("regenerate_tenant_token", { p_tenant_id: tenantId });
  if (error) throw error;
  return String(data);
}

export interface PublicTenantPage {
  tenant_name: string;
  move_in_date: string;
  move_out_date: string | null;
  room_name: string;
  property_name: string;
  monthly_rent_cents: number;
  due_day: number;
  balance_cents: number;
  overdue_cents: number;
  paid_this_month_cents: number;
  oldest_unpaid_due_date: string | null;
  payment_status: RentStatus;
  landlord_name: string;
  landlord_phone: string;
  property_address: string | null;
}

export interface PublicTenantReceipt {
  paid_on: string;
  created_at: string;
  amount_cents: number;
  method: PaymentMethod;
  receipt_number: string;
  balance_after_cents: number;
}

function isRentStatus(value: string): value is RentStatus {
  return value === "paid" || value === "part_paid" || value === "late" || value === "not_due";
}

function isPaymentMethod(value: string): value is PaymentMethod {
  return value === "cash" || value === "eft" || value === "ewallet" || value === "other";
}

export async function getPublicTenantPage(token: string): Promise<PublicTenantPage | null> {
  const { data, error } = await supabase.rpc("get_tenant_page_v2", { p_access_token: token });
  if (error) throw error;
  const page = data?.[0];
  if (!page) return null;
  if (!isRentStatus(page.payment_status)) {
    throw new Error("Tenant payment status returned an invalid value");
  }
  return { ...page, payment_status: page.payment_status };
}

export async function getPublicTenantReceipts(token: string): Promise<PublicTenantReceipt[]> {
  const { data, error } = await supabase.rpc("get_tenant_receipts", { p_access_token: token });
  if (error) throw error;
  return (data ?? []).map((receipt) => {
    if (!isPaymentMethod(receipt.method)) {
      throw new Error("Tenant receipt returned an invalid payment method");
    }
    return { ...receipt, method: receipt.method };
  });
}
