import { requireEnv } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import { todayInSA } from "@/lib/dates";
import type { Language, PaymentMethod, TenantPaymentInfo } from "@/types/domain";
import { lastSixMonthsCharges, type PublicTenantCharge } from "./charges";

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === "cash" || value === "eft" || value === "ewallet" || value === "other";
}

function isLanguage(value: unknown): value is Language {
  return value === "en" || value === "zu" || value === "xh" || value === "st";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSubmission(value: unknown): TenantPaymentInfo["submissions"][number] {
  if (!isRecord(value)) throw new Error("Tenant payment notice was invalid.");
  const method = value["method"];
  const status = value["status"];
  const amount = value["amount_cents"];
  const paidOn = value["paid_on"];
  const declineReason = value["decline_reason"];
  const createdAt = value["created_at"];
  if (
    !isPaymentMethod(method) ||
    (status !== "pending_confirmation" && status !== "declined") ||
    typeof amount !== "number" ||
    typeof paidOn !== "string" ||
    (declineReason !== null && typeof declineReason !== "string") ||
    typeof createdAt !== "string"
  ) {
    throw new Error("Tenant payment notice was invalid.");
  }
  return {
    amountCents: amount,
    paidOn,
    method,
    status,
    declineReason,
    createdAt,
  };
}

export async function getTenantPaymentInfo(token: string): Promise<TenantPaymentInfo | null> {
  const { data, error } = await supabase.rpc("tenant_payment_info", { p_token: token });
  if (error) throw error;
  if (data === null) return null;
  if (!isRecord(data)) throw new Error("Tenant payment details were invalid.");
  const language = data["language"];
  const submissions = data["submissions"];
  const bankDetails = data["bank_details"];
  const tenantName = data["tenant_name"];
  const roomName = data["room_name"];
  const landlordName = data["landlord_name"];
  const landlordPhone = data["landlord_phone"];
  if (
    !isLanguage(language) ||
    typeof tenantName !== "string" ||
    typeof roomName !== "string" ||
    (bankDetails !== null && typeof bankDetails !== "string") ||
    typeof landlordName !== "string" ||
    typeof landlordPhone !== "string" ||
    !Array.isArray(submissions)
  ) {
    throw new Error("Tenant payment details were invalid.");
  }

  return {
    tenantName,
    language,
    roomName,
    bankDetails,
    landlordName,
    landlordPhone,
    submissions: submissions.map(parseSubmission),
  };
}

function isChargeType(value: unknown): value is PublicTenantCharge["type"] {
  return value === "rent" || value === "electricity" || value === "water" || value === "other";
}

export async function getPublicTenantCharges(token: string): Promise<PublicTenantCharge[]> {
  const { data, error } = await supabase.rpc("tenant_charges", { p_token: token });
  if (error) throw error;
  if (data === null) return [];
  if (!Array.isArray(data)) throw new Error("Tenant charges returned an invalid result.");
  const charges = data.map((item, index) => {
    if (!isRecord(item)) throw new Error("Tenant charge was invalid.");
    const type = item["type"];
    const period = item["period"];
    const amountCents = item["amount_cents"];
    const dueDate = item["due_date"];
    const note = item["note"];
    if (
      !isChargeType(type) ||
      typeof period !== "string" ||
      typeof amountCents !== "number" ||
      typeof dueDate !== "string" ||
      (note !== null && typeof note !== "string")
    ) {
      throw new Error("Tenant charge was invalid.");
    }
    return {
      id: `${dueDate}-${type}-${period}-${index}`,
      type,
      period,
      amountCents,
      dueDate,
      note,
    };
  });
  return lastSixMonthsCharges(charges, todayInSA());
}

export type TenantNoticeErrorCode =
  | "invalid_link"
  | "invalid_input"
  | "too_many"
  | "duplicate"
  | "file_type"
  | "file_size"
  | "server";

export class TenantNoticeError extends Error {
  constructor(
    message: string,
    readonly code: TenantNoticeErrorCode,
  ) {
    super(message);
    this.name = "TenantNoticeError";
  }
}

function isNoticeErrorCode(value: unknown): value is TenantNoticeErrorCode {
  return (
    value === "invalid_link" ||
    value === "invalid_input" ||
    value === "too_many" ||
    value === "duplicate" ||
    value === "file_type" ||
    value === "file_size" ||
    value === "server"
  );
}

function errorMessage(code: TenantNoticeErrorCode): string {
  switch (code) {
    case "too_many":
      return "You have already sent several notices. Please contact your landlord.";
    case "duplicate":
      return "You have already told your landlord about this payment.";
    case "file_type":
    case "file_size":
      return "Choose a photo or PDF under 2 MB.";
    case "invalid_link":
      return "This link is not valid. Ask your landlord for a new one.";
    case "invalid_input":
      return "Check the payment details and try again.";
    case "server":
      return "Could not send. Check your connection and try again.";
  }
}

export async function submitTenantPayment(input: {
  token: string;
  amountCents: number;
  paidOn: string;
  method: PaymentMethod;
  proof: File | null;
}): Promise<void> {
  let proofPath: string | null = null;
  if (input.proof) {
    const { prepareProof } = await import("@/features/payments/proof");
    const prepared = await prepareProof(input.proof);
    if (prepared.contentType !== "application/pdf" && prepared.blob.size > 1024 * 1024) {
      throw new TenantNoticeError("Choose a smaller photo.", "file_size");
    }
    if (prepared.contentType === "application/pdf" && prepared.blob.size > 2 * 1024 * 1024) {
      throw new TenantNoticeError("Choose a PDF under 2 MB.", "file_size");
    }
    const folder = await supabase.rpc("tenant_proof_folder", { p_token: input.token });
    if (folder.error) throw new TenantNoticeError(errorMessage("server"), "server");
    if (typeof folder.data !== "string" || folder.data === "") {
      throw new TenantNoticeError(errorMessage("invalid_link"), "invalid_link");
    }
    proofPath = `${folder.data}/${crypto.randomUUID()}.${prepared.extension}`;
    const upload = await supabase.storage
      .from("payment-proofs")
      .upload(proofPath, prepared.blob, { contentType: prepared.contentType, upsert: false });
    if (upload.error) {
      console.error("Tenant proof upload failed.", upload.error);
      throw new TenantNoticeError(errorMessage("server"), "server");
    }
  }

  const { data, error } = await supabase.rpc("submit_tenant_payment", {
    p_token: input.token,
    p_amount_cents: input.amountCents,
    p_paid_on: input.paidOn,
    p_method: input.method,
    p_proof_path: proofPath,
  });
  if (error) {
    console.error("Tenant payment notice failed.", error);
    throw new TenantNoticeError(errorMessage("server"), "server");
  }
  if (data !== "ok") {
    const code = isNoticeErrorCode(data) ? data : "server";
    throw new TenantNoticeError(errorMessage(code), code);
  }
}
