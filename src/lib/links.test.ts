import { describe, expect, it } from "vitest";

import { tenantLink } from "./links";

describe("tenantLink", () => {
  it("builds a tenant link with a base URL", () => {
    expect(tenantLink("abc123", "https://yard.example.com")).toBe(
      "https://yard.example.com/t/abc123",
    );
  });

  it("falls back to the current origin when no base is supplied", () => {
    const value = tenantLink("abc123", "http://localhost:3000");
    expect(value).toBe("http://localhost:3000/t/abc123");
  });
});
