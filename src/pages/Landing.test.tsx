import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";

import Landing from "./Landing";

describe("Landing page", () => {
  it("shows the specified landing copy and sign-in links", () => {
    render(<Landing />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Rent records for backyard rooms" })).toBeTruthy();
    const getStartedLinks = screen.getAllByRole("link", { name: "Get started" });
    expect(getStartedLinks).toHaveLength(2);
    expect(getStartedLinks.every((link) => link.getAttribute("href") === "/sign-in")).toBe(true);
    expect(screen.getByRole("link", { name: /^Sign in$/ }).getAttribute("href")).toBe("/sign-in");
    expect(
      screen.getByRole("link", { name: "Already use Yard? Sign in" }).getAttribute("href"),
    ).toBe("/sign-in");
    expect(screen.getByText("Yard writes the message for you. You press send.")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "If you are a tenant" })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/!/);
  });

  it("has no axe accessibility violations", async () => {
    const { container } = render(<Landing />);
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});
