import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { progressWidth, SummaryPanel } from "./SummaryPanel";

describe("progressWidth", () => {
  it.each([
    [0, 100, 0],
    [1, 3, 33],
    [1, 2, 50],
    [150, 100, 100],
    [-10, 100, 0],
    [10, 0, null],
    [10, -1, null],
  ])("calculates a bounded percentage for %i of %i", (collected, expected, width) => {
    expect(progressWidth(collected, expected)).toBe(width);
  });
});

describe("SummaryPanel", () => {
  it("renders the accessible progress description and measured bar width", () => {
    const { container } = render(
      <SummaryPanel
        label="Collected this month"
        figure="R500"
        progress={{ collectedCents: 50, expectedCents: 200, text: "25% collected" }}
      />,
    );

    expect(screen.getByText("25% collected")).toBeTruthy();
    expect(container.querySelector('[aria-hidden="true"] > div')?.getAttribute("style")).toContain(
      "width: 25%",
    );
  });
});
