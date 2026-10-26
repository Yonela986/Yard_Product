export function tenantLink(token: string, base?: string): string {
  const trimmed = token.trim();
  if (!trimmed) return "/t/";
  const origin = base ?? (typeof window !== "undefined" ? window.location.origin : "");
  if (!origin) return `/t/${trimmed}`;
  const pathname = `/t/${trimmed}`;
  return new URL(pathname, origin).toString();
}
