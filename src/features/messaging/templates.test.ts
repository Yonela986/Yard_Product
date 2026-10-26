import { describe, expect, it } from "vitest";

import { MESSAGE_TEMPLATES, daysPhrase } from "./templates";
import { renderTemplate } from "./render";

const variables = {
  name: "  Ava Ndlovu  ",
  room: "Room 2",
  amount: 120_000,
  due_date: "2026-11-05",
  days_phrase: "5 days",
  date: "2026-11-05",
  receipt_number: "YD-00012",
  link: "https://yard.example.com/t/token",
};

describe("message templates", () => {
  it("renders all six templates in all languages without unresolved braces", () => {
    for (const language of ["en", "zu", "xh", "st"] as const) {
      for (const template of Object.values(MESSAGE_TEMPLATES)) {
        const message = renderTemplate(template[language], variables);
        expect(message).not.toMatch(/[{}]/);
      }
    }
  });

  it("uses the same variable set in every translation of each template", () => {
    for (const template of Object.values(MESSAGE_TEMPLATES)) {
      const sets = Object.values(template).map((text) =>
        [...text.matchAll(/\{([a-z_]+)\}/g)].map((match) => match[1]).sort(),
      );
      for (const variablesInTranslation of sets.slice(1)) {
        expect(variablesInTranslation).toEqual(sets[0]);
      }
    }
  });

  it.each([
    ["en", 1, "1 day"],
    ["en", 2, "2 days"],
    ["en", 10, "10 days"],
    ["zu", 1, "ngosuku olulodwa"],
    ["zu", 2, "ngezinsuku ezingu-2"],
    ["zu", 10, "ngezinsuku ezingu-10"],
    ["xh", 1, "ngosuku olunye"],
    ["xh", 2, "ngeentsuku ezi-2"],
    ["xh", 10, "ngeentsuku ezi-10"],
    ["st", 1, "ka letsatsi le le leng"],
    ["st", 2, "ka matsatsi a 2"],
    ["st", 10, "ka matsatsi a 10"],
  ] as const)("formats %s days phrase for %i days", (language, days, phrase) => {
    expect(daysPhrase(language, days)).toBe(phrase);
  });
});
