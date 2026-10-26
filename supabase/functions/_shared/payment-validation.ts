export const MAX_AMOUNT_CENTS = 5_000_000;
export const MAX_IMAGE_BYTES = 1 * 1024 * 1024;
export const MAX_PDF_BYTES = 2 * 1024 * 1024;
export const MAX_NOTICES_PER_24_HOURS = 5;
export const MAX_PENDING_NOTICES = 3;

export type ProofMimeType = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
export type ProofExtension = "jpg" | "png" | "webp" | "pdf";

export type ProofInspection =
  | { ok: true; mimeType: ProofMimeType; extension: ProofExtension }
  | { ok: false; code: "file_type" | "file_size" };

export interface PendingNoticeForLimit {
  amountCents: number;
  paidOn: string;
}

export interface NoticeLimitInput {
  now: number;
  createdAt: string[];
  pendingCount: number;
  amountCents: number;
  paidOn: string;
  pendingNotices: PendingNoticeForLimit[];
}

export type NoticeLimitFailure = "too_many" | "duplicate";

export function isValidAmountCents(value: number): boolean {
  return Number.isInteger(value) && value > 0 && value <= MAX_AMOUNT_CENTS;
}

function parseISODate(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== value) {
    return null;
  }
  return parsed;
}

export function southAfricanToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function isValidPaidOn(paidOn: string, today: string): boolean {
  const paidAt = parseISODate(paidOn);
  const todayAt = parseISODate(today);
  if (paidAt === null || todayAt === null || paidAt > todayAt) return false;
  const earliest = todayAt - 90 * 24 * 60 * 60 * 1000;
  return paidAt >= earliest;
}

function bytesEqual(bytes: Uint8Array, start: number, expected: readonly number[]): boolean {
  return expected.every((byte, index) => bytes[start + index] === byte);
}

export function inspectProof(bytes: Uint8Array): ProofInspection {
  let mimeType: ProofMimeType;
  let extension: ProofExtension;
  if (bytesEqual(bytes, 0, [0xff, 0xd8, 0xff])) {
    mimeType = "image/jpeg";
    extension = "jpg";
  } else if (bytesEqual(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    mimeType = "image/png";
    extension = "png";
  } else if (
    bytesEqual(bytes, 0, [0x52, 0x49, 0x46, 0x46]) &&
    bytesEqual(bytes, 8, [0x57, 0x45, 0x42, 0x50])
  ) {
    mimeType = "image/webp";
    extension = "webp";
  } else if (bytesEqual(bytes, 0, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    mimeType = "application/pdf";
    extension = "pdf";
  } else {
    return { ok: false, code: "file_type" };
  }

  const maxBytes = mimeType === "application/pdf" ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
  if (bytes.byteLength > maxBytes) return { ok: false, code: "file_size" };
  return { ok: true, mimeType, extension };
}

export function noticeLimitFailure(input: NoticeLimitInput): NoticeLimitFailure | null {
  const cutoff = input.now - 24 * 60 * 60 * 1000;
  const recentCount = input.createdAt.reduce((count, timestamp) => {
    const createdAt = Date.parse(timestamp);
    return Number.isFinite(createdAt) && createdAt >= cutoff && createdAt <= input.now
      ? count + 1
      : count;
  }, 0);
  if (recentCount >= MAX_NOTICES_PER_24_HOURS || input.pendingCount >= MAX_PENDING_NOTICES) {
    return "too_many";
  }
  if (
    input.pendingNotices.some(
      (notice) => notice.amountCents === input.amountCents && notice.paidOn === input.paidOn,
    )
  ) {
    return "duplicate";
  }
  return null;
}
