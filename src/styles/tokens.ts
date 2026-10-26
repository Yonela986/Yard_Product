/** Colour values mirrored from src/styles/index.css. Used by the contrast test. */
export const colors = {
  ground: "#fafaf7",
  ink: "#1a1a1a",
  inkMuted: "#6b6b6b",
  line: "#e3e2dc",
  surface: "#ffffff",
  brand: "#1f5f3f",
  onBrand: "#fafaf7",
  onBrandMuted: "#c9d9cf",
  brandTint: "#e6efe9",
  neutralTint: "#eeeeea",
  statusPaid: "#1f5f3f",
  statusPart: "#b7791f",
  statusLate: "#b23b3b",
  statusNeutral: "#6b6b6b",
  statusPaidInk: "#1f5f3f",
  statusPaidTint: "#e6efe9",
  statusPartInk: "#7a4f0a",
  statusPartTint: "#f6ebd5",
  statusLateInk: "#8f2e2e",
  statusLateTint: "#f4e1e1",
  statusNeutralInk: "#4f4f4f",
  statusNeutralTint: "#eeeeea",
} as const;

export type ColorName = keyof typeof colors;

/** Text on background pairs that must reach 4.5:1. */
export const textPairs: Array<[ColorName, ColorName]> = [
  ["statusPaidInk", "statusPaidTint"],
  ["statusPartInk", "statusPartTint"],
  ["statusLateInk", "statusLateTint"],
  ["statusNeutralInk", "statusNeutralTint"],
  ["ink", "surface"],
  ["ink", "ground"],
  ["inkMuted", "ground"],
  ["inkMuted", "surface"],
  ["ink", "neutralTint"],
  ["onBrand", "brand"],
  ["onBrandMuted", "brand"],
  ["brand", "brandTint"],
];

/** Non-text shapes (status dots, progress bar) that must reach 3:1. */
export const shapePairs: Array<[ColorName, ColorName]> = [
  ["statusPaid", "statusPaidTint"],
  ["statusPart", "statusPartTint"],
  ["statusLate", "statusLateTint"],
  ["statusNeutral", "statusNeutralTint"],
  ["statusPaid", "surface"],
  ["statusPart", "surface"],
  ["statusLate", "surface"],
  ["statusNeutral", "surface"],
  ["onBrand", "brand"],
];

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
