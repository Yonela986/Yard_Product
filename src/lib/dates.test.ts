import { describe, expect, it } from "vitest";

import { dueDateFor, formatMonthLabel, formatShortDate, toPeriod, todayInSA } from "./dates";

describe("todayInSA", () => {
  it("uses Johannesburg time, not UTC", () => {
    // 23:30 UTC on 9 Oct is 01:30 on 10 Oct in SA (UTC+2).
    expect(todayInSA(new Date("2026-10-09T23:30:00Z"))).toBe("2026-10-10");
    expect(todayInSA(new Date("2026-10-09T21:59:00Z"))).toBe("2026-10-09");
  });
  it("handles year end", () => {
    expect(todayInSA(new Date("2026-12-31T22:00:00Z"))).toBe("2027-01-01");
  });
});

describe("formatShortDate", () => {
  it("omits the current year", () => {
    expect(formatShortDate("2026-10-03", "2026-10-10")).toBe("3 Oct");
  });
  it("shows another year", () => {
    expect(formatShortDate("2025-10-03", "2026-10-10")).toBe("3 Oct 2025");
    expect(formatShortDate("2027-01-15", "2026-10-10")).toBe("15 Jan 2027");
  });
  it("rejects bad input", () => {
    expect(() => formatShortDate("3 Oct", "2026-10-10")).toThrow();
  });
});

describe("formatMonthLabel", () => {
  it("formats a period", () => {
    expect(formatMonthLabel("2026-10")).toBe("October 2026");
    expect(formatMonthLabel("2027-01")).toBe("January 2027");
  });
});

describe("toPeriod", () => {
  it("returns YYYY-MM", () => {
    expect(toPeriod("2026-10-03")).toBe("2026-10");
  });
});

describe("dueDateFor", () => {
  it("builds the due date", () => {
    expect(dueDateFor("2026-10", 1)).toBe("2026-10-01");
    expect(dueDateFor("2026-10", 25)).toBe("2026-10-25");
  });
  it("clamps to month end", () => {
    expect(dueDateFor("2026-02", 31)).toBe("2026-02-28");
    expect(dueDateFor("2028-02", 30)).toBe("2028-02-29");
    expect(dueDateFor("2026-04", 31)).toBe("2026-04-30");
  });
  it("rejects invalid due days", () => {
    expect(() => dueDateFor("2026-10", 0)).toThrow();
    expect(() => dueDateFor("2026-10", 32)).toThrow();
  });
});

describe("ordinal", () => {
  it.each([
    [1, "1st"],
    [2, "2nd"],
    [3, "3rd"],
    [4, "4th"],
    [11, "11th"],
    [12, "12th"],
    [13, "13th"],
    [21, "21st"],
    [22, "22nd"],
    [23, "23rd"],
    [28, "28th"],
  ])("%i → %s", async (n, out) => {
    const { ordinal } = await import("./dates");
    expect(ordinal(n)).toBe(out);
  });
});
