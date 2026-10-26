import { describe, expect, it } from "vitest";

import {
  inspectProof,
  isValidAmountCents,
  isValidPaidOn,
  MAX_AMOUNT_CENTS,
  MAX_IMAGE_BYTES,
  MAX_NOTICES_PER_24_HOURS,
  MAX_PENDING_NOTICES,
  MAX_PDF_BYTES,
  noticeLimitFailure,
  southAfricanToday,
} from "./payment-validation";

const now = Date.parse("2026-10-12T08:00:00.000Z");
const validLimits = {
  now,
  createdAt: [] as string[],
  pendingCount: 0,
  amountCents: 10_000,
  paidOn: "2026-10-12",
  pendingNotices: [] as { amountCents: number; paidOn: string }[],
};

describe("tenant payment validation", () => {
  it("enforces the amount bounds in cents", () => {
    expect(isValidAmountCents(1)).toBe(true);
    expect(isValidAmountCents(MAX_AMOUNT_CENTS)).toBe(true);
    expect(isValidAmountCents(0)).toBe(false);
    expect(isValidAmountCents(MAX_AMOUNT_CENTS + 1)).toBe(false);
    expect(isValidAmountCents(1.5)).toBe(false);
  });

  it("accepts valid payment dates through 90 days before South African today", () => {
    expect(southAfricanToday(new Date("2026-10-11T23:00:00.000Z"))).toBe("2026-10-12");
    expect(isValidPaidOn("2026-10-12", "2026-10-12")).toBe(true);
    expect(isValidPaidOn("2026-07-14", "2026-10-12")).toBe(true);
    expect(isValidPaidOn("2026-07-13", "2026-10-12")).toBe(false);
    expect(isValidPaidOn("2026-10-13", "2026-10-12")).toBe(false);
    expect(isValidPaidOn("2026-02-30", "2026-10-12")).toBe(false);
  });

  it.each([
    [[0xff, 0xd8, 0xff, 0x00], "image/jpeg", "jpg"],
    [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], "image/png", "png"],
    [[0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50], "image/webp", "webp"],
    [[0x25, 0x50, 0x44, 0x46, 0x2d], "application/pdf", "pdf"],
  ] as const)("sniffs %s from bytes", (signature, mimeType, extension) => {
    expect(inspectProof(Uint8Array.from(signature))).toEqual({ ok: true, mimeType, extension });
  });

  it("rejects a text file even when the client names it .jpg", () => {
    expect(inspectProof(new TextEncoder().encode("not an image"))).toEqual({
      ok: false,
      code: "file_type",
    });
  });

  it("applies byte-size limits after identifying the actual file type", () => {
    const tooLargeImage = new Uint8Array(MAX_IMAGE_BYTES + 1);
    tooLargeImage.set([0xff, 0xd8, 0xff]);
    expect(inspectProof(tooLargeImage)).toEqual({ ok: false, code: "file_size" });

    const tooLargePdf = new Uint8Array(MAX_PDF_BYTES + 1);
    tooLargePdf.set([0x25, 0x50, 0x44, 0x46, 0x2d]);
    expect(inspectProof(tooLargePdf)).toEqual({ ok: false, code: "file_size" });
  });

  it("enforces 5 notices per rolling 24 hours and 3 pending notices", () => {
    expect(
      noticeLimitFailure({
        ...validLimits,
        createdAt: Array.from({ length: MAX_NOTICES_PER_24_HOURS }, () =>
          new Date(now - 1_000).toISOString(),
        ),
      }),
    ).toBe("too_many");
    expect(noticeLimitFailure({ ...validLimits, pendingCount: MAX_PENDING_NOTICES })).toBe(
      "too_many",
    );
    expect(noticeLimitFailure(validLimits)).toBeNull();
  });

  it("blocks duplicate amount and date only against an existing pending notice", () => {
    expect(
      noticeLimitFailure({
        ...validLimits,
        pendingNotices: [{ amountCents: 10_000, paidOn: "2026-10-12" }],
      }),
    ).toBe("duplicate");
    expect(
      noticeLimitFailure({
        ...validLimits,
        pendingNotices: [{ amountCents: 10_000, paidOn: "2026-10-11" }],
      }),
    ).toBeNull();
  });
});
