import { format, getDaysInMonth, parse } from "date-fns";

/** Dates are plain "YYYY-MM-DD" strings, periods are "YYYY-MM". */
export type ISODate = string;
export type Period = string;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const PERIOD_RE = /^(\d{4})-(\d{2})$/;
const SA_TZ = "Africa/Johannesburg";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function parts(date: ISODate): { y: number; m: number; d: number } {
  const match = DATE_RE.exec(date);
  if (!match) throw new Error(`Invalid date: ${date}`);
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

/** Today's date in Africa/Johannesburg, whatever the phone's own time zone. */
export function todayInSA(now: Date = new Date()): ISODate {
  // en-CA formats as YYYY-MM-DD. Only digits are used, so ICU differences don't matter.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: SA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const get = (type: string) => fmt.formatToParts(now).find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** "3 Oct", or "3 Oct 2026" when the year is not the current one. */
export function formatShortDate(date: ISODate, today: ISODate = todayInSA()): string {
  const { y, m, d } = parts(date);
  const month = (MONTHS[m - 1] ?? "").slice(0, 3);
  const currentYear = parts(today).y;
  return y === currentYear ? `${d} ${month}` : `${d} ${month} ${y}`;
}

/** "October 2026". */
export function formatMonthLabel(period: Period): string {
  const match = PERIOD_RE.exec(period);
  if (!match) throw new Error(`Invalid period: ${period}`);
  return `${MONTHS[Number(match[2]) - 1] ?? ""} ${match[1]}`;
}

export function toPeriod(date: ISODate): Period {
  parts(date);
  return date.slice(0, 7);
}

/** Due date in a period; a due day past month end clamps to the last day. */
export function dueDateFor(period: Period, dueDay: number): ISODate {
  if (!PERIOD_RE.test(period)) throw new Error(`Invalid period: ${period}`);
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
    throw new Error(`Invalid due day: ${dueDay}`);
  }
  const monthStart = parse(`${period}-01`, "yyyy-MM-dd", new Date(2000, 0, 1));
  const day = Math.min(dueDay, getDaysInMonth(monthStart));
  return `${period}-${format(new Date(2000, 0, day), "dd")}`;
}

/** 1 → "1st", 2 → "2nd", 11 → "11th", 22 → "22nd". */
export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const suffix = ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
}
