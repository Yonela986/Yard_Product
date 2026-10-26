import { describe, expect, it } from "vitest";

import { fittedImageSize } from "./proof";

describe("fittedImageSize", () => {
  it("scales the longest side to 1600 and preserves aspect ratio", () => {
    expect(fittedImageSize(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fittedImageSize(3000, 4000)).toEqual({ width: 1200, height: 1600 });
  });

  it("does not enlarge small images", () => {
    expect(fittedImageSize(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fittedImageSize(1, 100_000)).toEqual({ width: 1, height: 1600 });
  });

  it("rejects invalid image dimensions", () => {
    expect(() => fittedImageSize(0, 10)).toThrow();
    expect(() => fittedImageSize(10, 10, 0)).toThrow();
  });
});
