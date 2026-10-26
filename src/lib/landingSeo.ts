export type LandingSeo = {
  canonical: string;
  image: string;
};

export function landingSeo(appUrl: string | undefined): LandingSeo | null {
  if (!appUrl?.trim()) return null;
  let url: URL;
  try {
    url = new URL(appUrl);
  } catch (error) {
    throw new Error("VITE_PUBLIC_APP_URL must be an absolute HTTP or HTTPS URL.", { cause: error });
  }
  if (
    (url.protocol !== "https:" && url.protocol !== "http:") ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new Error(
      "VITE_PUBLIC_APP_URL must use HTTP or HTTPS and must not include a query or hash.",
    );
  }
  const canonical = url.href.replace(/\/+$/, "");
  return { canonical, image: `${canonical}/og-image.png` };
}

export function injectLandingSeo(html: string, appUrl: string | undefined): string {
  const seo = landingSeo(appUrl);
  if (!seo) return html;
  const stripped = html
    .replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, "")
    .replace(/<meta\b[^>]*\bproperty=["']og:url["'][^>]*>/gi, "")
    .replace(/<meta\b[^>]*\bproperty=["']og:image["'][^>]*>/gi, "");
  const tags =
    `<link rel="canonical" href="${seo.canonical}">` +
    `<meta property="og:url" content="${seo.canonical}">` +
    `<meta property="og:image" content="${seo.image}">`;
  return stripped.replace(/<\/head>/i, `${tags}</head>`);
}
