import { supabase } from "@/lib/supabase";
import type { Payment, PaymentMethod, PendingPaymentRow } from "@/types/domain";

import { sortPendingPaymentsOldestFirst } from "./pending";

function isPaymentMethod(value: string): value is PaymentMethod {
  return value === "cash" || value === "eft" || value === "ewallet" || value === "other";
}

export interface CreatePaymentInput {
  tenantId: string;
  landlordId: string;
  amountCents: number;
  paidOn: string;
  method: PaymentMethod;
  proof: File | null;
}

export async function listTenantPayments(tenantId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("paid_on", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Payment[];
}

export async function getPayment(tenantId: string, paymentId: string): Promise<Payment | null> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", paymentId)
    .maybeSingle();
  if (error) throw error;
  return data as Payment | null;
}

export async function listPendingPayments(): Promise<PendingPaymentRow[]> {
  const { data: pending, error: pendingError } = await supabase
    .from("payments")
    .select("id, tenant_id, amount_cents, paid_on, method, proof_url, created_at")
    .eq("status", "pending_confirmation")
    .eq("created_by", "tenant")
    .order("created_at", { ascending: true });
  if (pendingError) throw pendingError;
  if (!pending?.length) return [];

  const tenantIds = [...new Set(pending.map((payment) => payment.tenant_id))];
  const { data: tenants, error: tenantsError } = await supabase
    .from("tenants")
    .select("id, name, room_id")
    .in("id", tenantIds);
  if (tenantsError) throw tenantsError;
  const tenantById = new Map((tenants ?? []).map((tenant) => [tenant.id, tenant]));
  const roomIds = [...new Set((tenants ?? []).map((tenant) => tenant.room_id))];
  if (roomIds.length === 0) throw new Error("Pending payments refer to missing tenants.");
  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("id, name")
    .in("id", roomIds);
  if (roomsError) throw roomsError;
  const roomById = new Map((rooms ?? []).map((room) => [room.id, room]));

  const rows = pending.map((payment) => {
    const tenant = tenantById.get(payment.tenant_id);
    const room = tenant ? roomById.get(tenant.room_id) : undefined;
    if (!tenant || !room) throw new Error("Pending payment details could not be resolved.");
    if (!isPaymentMethod(payment.method)) throw new Error("Pending payment method was invalid.");
    return {
      paymentId: payment.id,
      tenantId: payment.tenant_id,
      tenantName: tenant.name,
      roomName: room.name,
      amountCents: payment.amount_cents,
      paidOn: payment.paid_on,
      method: payment.method,
      hasProof: payment.proof_url !== null,
      createdAt: payment.created_at,
    };
  });
  return sortPendingPaymentsOldestFirst(rows);
}

export async function createPayment(input: CreatePaymentInput): Promise<Payment> {
  let proofPath: string | null = null;
  if (input.proof) {
    const { prepareProof } = await import("./proof");
    const prepared = await prepareProof(input.proof);
    proofPath = `${input.landlordId}/${input.tenantId}/${crypto.randomUUID()}.${prepared.extension}`;
    const { error: uploadError } = await supabase.storage
      .from("payment-proofs")
      .upload(proofPath, prepared.blob, {
        contentType: prepared.contentType,
        upsert: false,
      });
    if (uploadError) throw uploadError;
  }

  try {
    const { data, error } = await supabase
      .from("payments")
      .insert({
        tenant_id: input.tenantId,
        amount_cents: input.amountCents,
        paid_on: input.paidOn,
        method: input.method,
        proof_url: proofPath,
        status: "confirmed",
        created_by: "landlord",
      })
      .select()
      .single();
    if (error) throw error;
    return data as Payment;
  } catch (error) {
    if (proofPath) {
      try {
        const { error: removeError } = await supabase.storage
          .from("payment-proofs")
          .remove([proofPath]);
        if (removeError)
          console.error("Could not remove uploaded payment proof after save failure.", removeError);
      } catch (cleanupError) {
        console.error("Could not remove uploaded payment proof after save failure.", cleanupError);
      }
    }
    throw error;
  }
}

export async function createProofSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("payment-proofs")
    .createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function voidPayment(paymentId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc("void_payment", {
    p_payment_id: paymentId,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function confirmPendingPayment(input: {
  paymentId: string;
  amountCents: number;
  paidOn: string;
  method: PaymentMethod;
}): Promise<string> {
  const { data, error } = await supabase.rpc("confirm_pending_payment", {
    p_payment_id: input.paymentId,
    p_amount_cents: input.amountCents,
    p_paid_on: input.paidOn,
    p_method: input.method,
  });
  if (error) throw error;
  return data;
}

export async function declinePendingPayment(paymentId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc("decline_pending_payment", {
    p_payment_id: paymentId,
    p_reason: reason,
  });
  if (error) throw error;
}
