import { describe, expect, it } from "vitest";

import { initials } from "./initials";

describe("initials", () => {
  it.each([
    ["Ava Ndlovu", "AN"],
    ["  ava   marie ndlovu  ", "AN"],
    ["Ava", "A"],
    ["", "·"],
    ["   ", "·"],
  ])("returns initials for %j", (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});
