/** First letter of the first and last words, uppercased. Empty gives "·". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0];
  if (!first) return "·";
  const last = words.length > 1 ? words[words.length - 1] : undefined;
  return `${first[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}
