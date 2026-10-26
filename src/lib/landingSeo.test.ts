import { describe, expect, it } from "vitest";

import { injectLandingSeo, landingSeo } from "./landingSeo";

describe("landing SEO metadata", () => {
  it("omits absolute-address metadata when no public URL is configured", () => {
    expect(landingSeo(undefined)).toBeNull();
    expect(injectLandingSeo("<html><head></head></html>", "")).toBe("<html><head></head></html>");
  });

  it("builds canonical and preview URLs from the configured absolute address", () => {
    expect(landingSeo("https://yard.example/")).toEqual({
      canonical: "https://yard.example",
      image: "https://yard.example/og-image.png",
    });
    const html = injectLandingSeo("<html><head></head></html>", "https://yard.example");
    expect(html).toContain('<link rel="canonical" href="https://yard.example">');
    expect(html).toContain('<meta property="og:url" content="https://yard.example">');
    expect(html).toContain(
      '<meta property="og:image" content="https://yard.example/og-image.png">',
    );
  });

  it("rejects invalid public addresses explicitly", () => {
    expect(() => landingSeo("not an absolute URL")).toThrow(
      "VITE_PUBLIC_APP_URL must be an absolute HTTP or HTTPS URL.",
    );
    expect(() => landingSeo("javascript:alert(1)")).toThrow(
      "VITE_PUBLIC_APP_URL must use HTTP or HTTPS and must not include a query or hash.",
    );
    expect(() => landingSeo("https://yard.example/?preview=1")).toThrow(
      "VITE_PUBLIC_APP_URL must use HTTP or HTTPS and must not include a query or hash.",
    );
  });
});
