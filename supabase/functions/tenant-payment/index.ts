import { createClient } from "npm:@supabase/supabase-js@2";

import {
  inspectProof,
  isValidAmountCents,
  isValidPaidOn,
  noticeLimitFailure,
  southAfricanToday,
} from "../_shared/payment-validation.ts";

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string): boolean {
  if (/^http:\/\/localhost(?::\d+)?$/.test(origin)) return true;
  return allowedOrigins.some((allowedOrigin) => {
    try {
      return new URL(allowedOrigin).origin === origin;
    } catch {
      return false;
    }
  });
}

function response(
  status: number,
  body: Record<string, string | boolean>,
  origin?: string,
): Response {
  return Response.json(body, {
    status,
    headers: {
      ...(origin && isAllowedOrigin(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
      "Access-Control-Allow-Headers": "authorization, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      Vary: "Origin",
    },
  });
}

function fail(status: number, code: string, message: string, origin?: string): Response {
  return response(status, { ok: false, code, error: message }, origin);
}

const methods = new Set(["cash", "eft", "ewallet", "other"]);
const maxRequestBytes = 2 * 1024 * 1024 + 64 * 1024;

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin") ?? undefined;
  if (origin && !isAllowedOrigin(origin)) {
    return fail(403, "invalid_input", "Origin not allowed.", origin);
  }

  if (request.method === "OPTIONS") {
    if (!origin || !isAllowedOrigin(origin)) {
      return fail(403, "invalid_input", "Origin not allowed.");
    }
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "authorization, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        Vary: "Origin",
      },
    });
  }
  if (request.method !== "POST") {
    return fail(405, "invalid_input", "Use POST to send a payment notice.", origin);
  }

  const contentLength = Number(request.headers.get("Content-Length") ?? 0);
  if (contentLength > maxRequestBytes) {
    return fail(413, "file_size", "Choose a photo or PDF under 2 MB.", origin);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "invalid_input", "Enter valid payment details.", origin);
  }

  const tokenValue = form.get("token");
  const token = typeof tokenValue === "string" ? tokenValue : "";
  if (token.length < 32) {
    return fail(
      404,
      "invalid_link",
      "This link is not valid. Ask your landlord for a new one.",
      origin,
    );
  }
  const amountValue = form.get("amount_cents");
  const amountCents =
    typeof amountValue === "string" && /^\d+$/.test(amountValue) ? Number(amountValue) : NaN;
  const paidOnValue = form.get("paid_on");
  const methodValue = form.get("method");
  const paidOn = typeof paidOnValue === "string" ? paidOnValue : "";
  const method = typeof methodValue === "string" ? methodValue : "";
  const today = southAfricanToday();
  if (!isValidAmountCents(amountCents) || !isValidPaidOn(paidOn, today) || !methods.has(method)) {
    return fail(400, "invalid_input", "Check the amount, date and payment method.", origin);
  }

  const proofValue = form.get("proof");
  if (proofValue !== null && !(proofValue instanceof File)) {
    return fail(400, "invalid_input", "Choose a photo or PDF.", origin);
  }
  let proof: { bytes: Uint8Array; mimeType: string; extension: string } | null = null;
  if (proofValue instanceof File) {
    if (proofValue.size > 2 * 1024 * 1024) {
      return fail(400, "file_size", "Choose a photo or PDF under 2 MB.", origin);
    }
    const bytes = new Uint8Array(await proofValue.arrayBuffer());
    const inspected = inspectProof(bytes);
    if (!inspected.ok) {
      const message =
        inspected.code === "file_size"
          ? "Choose a photo or PDF under 2 MB."
          : "Choose a valid JPEG, PNG, WebP photo or PDF.";
      return fail(400, inspected.code, message, origin);
    }
    proof = { bytes, mimeType: inspected.mimeType, extension: inspected.extension };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Required Supabase function environment is missing.");
    return fail(500, "server", "Could not send. Check your connection and try again.", origin);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: tenant, error: tenantError } = await admin
      .from("tenants")
      .select("id, room_id")
      .eq("access_token", token)
      .maybeSingle();
    if (tenantError) throw tenantError;
    if (!tenant) {
      return fail(
        404,
        "invalid_link",
        "This link is not valid. Ask your landlord for a new one.",
        origin,
      );
    }

    const { data: room, error: roomError } = await admin
      .from("rooms")
      .select("property_id")
      .eq("id", tenant.room_id)
      .maybeSingle();
    if (roomError) throw roomError;
    if (!room) throw new Error("Tenant room lookup failed");

    const { data: property, error: propertyError } = await admin
      .from("properties")
      .select("landlord_id")
      .eq("id", room.property_id)
      .maybeSingle();
    if (propertyError) throw propertyError;
    if (!property) throw new Error("Tenant property lookup failed");

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [recentResult, pendingResult] = await Promise.all([
      admin
        .from("payments")
        .select("id, created_at", { count: "exact" })
        .eq("tenant_id", tenant.id)
        .eq("created_by", "tenant")
        .gte("created_at", cutoff),
      admin
        .from("payments")
        .select("amount_cents, paid_on")
        .eq("tenant_id", tenant.id)
        .eq("created_by", "tenant")
        .eq("status", "pending_confirmation"),
    ]);
    if (recentResult.error) throw recentResult.error;
    if (pendingResult.error) throw pendingResult.error;
    const pendingNotices = pendingResult.data ?? [];
    const limitError = noticeLimitFailure({
      now: Date.now(),
      createdAt: (recentResult.data ?? []).map((row) => row.created_at),
      pendingCount: pendingNotices.length,
      amountCents,
      paidOn,
      pendingNotices: pendingNotices.map((row) => ({
        amountCents: row.amount_cents,
        paidOn: row.paid_on,
      })),
    });
    if (limitError === "too_many") {
      return fail(
        429,
        "too_many",
        "You have already sent several notices. Please contact your landlord.",
        origin,
      );
    }
    if (limitError === "duplicate") {
      return fail(
        409,
        "duplicate",
        "You have already told your landlord about this payment.",
        origin,
      );
    }

    let proofPath: string | null = null;
    if (proof) {
      proofPath = `${property.landlord_id}/${tenant.id}/${crypto.randomUUID()}.${proof.extension}`;
      const { error: uploadError } = await admin.storage
        .from("payment-proofs")
        .upload(proofPath, proof.bytes, { contentType: proof.mimeType, upsert: false });
      if (uploadError) throw uploadError;
    }

    const { error: insertError } = await admin.from("payments").insert({
      tenant_id: tenant.id,
      amount_cents: amountCents,
      paid_on: paidOn,
      method,
      proof_url: proofPath,
      status: "pending_confirmation",
      created_by: "tenant",
    });
    if (insertError) {
      if (proofPath) {
        const { error: removeError } = await admin.storage
          .from("payment-proofs")
          .remove([proofPath]);
        if (removeError) {
          console.error("Could not remove proof after the notice insert failed.", removeError);
        }
      }
      throw insertError;
    }

    return response(200, { ok: true }, origin);
  } catch (error) {
    console.error("Tenant payment notice failed.", error);
    return fail(500, "server", "Could not send. Check your connection and try again.", origin);
  }
});
