import { describe, expect, it } from "vitest";

import { defaultMoveOutDate, moveOutDateError } from "./moveOut";

describe("moveOutDateError", () => {
  it("accepts today", () => {
    expect(moveOutDateError("2026-10-12", "2026-01-01")).toBeNull();
  });
  it("accepts the move-in date", () => {
    expect(moveOutDateError("2026-01-01", "2026-01-01")).toBeNull();
  });
  it("accepts a future date", () => {
    expect(moveOutDateError("2026-11-30", "2026-01-01")).toBeNull();
  });
  it("rejects an empty date", () => {
    expect(moveOutDateError("", "2026-01-01")).toBe("Choose the move-out date.");
  });
  it("rejects a date before move-in", () => {
    expect(moveOutDateError("2025-12-31", "2026-01-01")).toBe(
      "The move-out date cannot be before the move-in date.",
    );
  });
});

describe("defaultMoveOutDate", () => {
  it("uses today for a tenant who has moved in", () => {
    expect(defaultMoveOutDate("2026-01-01", "2026-10-13")).toBe("2026-10-13");
  });
  it("uses the move-in date for a future tenant", () => {
    expect(defaultMoveOutDate("2026-11-01", "2026-10-13")).toBe("2026-11-01");
  });
});
