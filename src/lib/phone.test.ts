import { describe, expect, it } from "vitest";

import { parseSAPhone } from "./phone";

describe("parseSAPhone", () => {
  it.each([
    "082 123 4567",
    "0821234567",
    "+27 82 123 4567",
    "27821234567",
    "0027821234567",
    "(082) 123-4567",
  ])("accepts %s", (input) => {
    const r = parseSAPhone(input);
    expect(r.ok && r.phone).toEqual({
      e164: "+27821234567",
      whatsapp: "27821234567",
      display: "082 123 4567",
    });
  });

  it("accepts 06 and 07 numbers", () => {
    expect(parseSAPhone("061 234 5678").ok).toBe(true);
    expect(parseSAPhone("072 234 5678").ok).toBe(true);
  });

  it.each([
    ["landline", "021 123 4567"],
    ["landline international", "+27 11 123 4567"],
    ["short", "082 123 456"],
    ["long", "082 123 45678"],
    ["letters", "082 ABC 4567"],
    ["foreign", "+44 7911 123456"],
    ["empty", ""],
  ])("rejects %s", (_label, input) => {
    expect(parseSAPhone(input).ok).toBe(false);
  });
});
