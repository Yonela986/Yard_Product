import { describe, expect, it } from "vitest";

import { MESSAGE_TEMPLATES } from "./templates";
import { buildWhatsAppUrl } from "./whatsapp";

describe("buildWhatsAppUrl", () => {
  it("normalizes a South African number to the wa.me number form", () => {
    expect(buildWhatsAppUrl("+27821234567", "Hi")).toBe("https://wa.me/27821234567?text=Hi");
  });

  it("encodes apostrophes, line breaks, and non-breaking spaces", () => {
    const url = buildWhatsAppUrl("082 123 4567", "It’s ready.\nR1\u00a0000");
    expect(url).toContain("wa.me/27821234567?");
    expect(url).toContain(encodeURIComponent("It’s ready.\nR1\u00a0000"));
  });

  it("keeps the longest template under 2000 characters", () => {
    const longest =
      Object.values(MESSAGE_TEMPLATES)
        .flatMap((translations) => Object.values(translations))
        .sort((a, b) => b.length - a.length)[0] ?? "";
    const url = buildWhatsAppUrl("+27821234567", longest.replace(/\{[a-z_]+\}/g, "sample"));
    expect(url.length).toBeLessThan(2000);
  });

  it("rejects invalid phone numbers and oversized messages", () => {
    expect(() => buildWhatsAppUrl("123", "Hi")).toThrow();
    expect(() => buildWhatsAppUrl("+27821234567", "a".repeat(2000))).toThrow("too long");
  });
});
