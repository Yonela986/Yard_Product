import { describe, expect, it } from "vitest";

import { createPaymentSchema, paymentPayload, voidPaymentSchema } from "./schema";

const schema = createPaymentSchema("2026-10-11");

describe("payment schema", () => {
  it("validates amount and converts it to integer cents", () => {
    expect(
      schema.safeParse({ amount: "250,50", paidOn: "2026-10-11", method: "cash", proof: null })
        .success,
    ).toBe(true);
    expect(
      paymentPayload({ amount: "250,50", paidOn: "2026-10-11", method: "cash", proof: null }),
    ).toMatchObject({
      amount_cents: 25_050,
      paid_on: "2026-10-11",
    });
    expect(
      schema.safeParse({ amount: "0", paidOn: "2026-10-11", method: "cash", proof: null }).success,
    ).toBe(false);
  });

  it("rejects a future payment date", () => {
    expect(
      schema.safeParse({ amount: "1", paidOn: "2026-10-12", method: "cash", proof: null }).success,
    ).toBe(false);
  });

  it("rejects unsupported proof type and files over 5 MB", () => {
    const unsupported = new File(["text"], "note.txt", { type: "text/plain" });
    const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "proof.pdf", {
      type: "application/pdf",
    });
    const base = { amount: "1", paidOn: "2026-10-11", method: "cash" };
    expect(schema.safeParse({ ...base, proof: unsupported }).success).toBe(false);
    expect(schema.safeParse({ ...base, proof: oversized }).success).toBe(false);
  });

  it("requires a reason to void a payment", () => {
    expect(voidPaymentSchema.safeParse({ reason: "  " }).success).toBe(false);
    expect(voidPaymentSchema.safeParse({ reason: "Entered twice" }).success).toBe(true);
  });
});
