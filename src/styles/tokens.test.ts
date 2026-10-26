import { describe, expect, it } from "vitest";

import { colors, contrast, shapePairs, textPairs } from "./tokens";

describe("colour contrast", () => {
  it.each(textPairs)("%s text on %s reaches 4.5:1", (fg, bg) => {
    expect(contrast(colors[fg], colors[bg])).toBeGreaterThanOrEqual(4.5);
  });
  it.each(shapePairs)("%s shape on %s reaches 3:1", (fg, bg) => {
    expect(contrast(colors[fg], colors[bg])).toBeGreaterThanOrEqual(3);
  });
});
