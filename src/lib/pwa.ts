/**
 * The only place that registers the service worker. Refuses in dev, iframes
 * and Lovable preview hosts, and unregisters stale workers there. `?sw=off`
 * is a kill switch.
 */
function isRefusedContext(): boolean {
  if (!import.meta.env.PROD) return true;
  if (window.self !== window.top) return true;
  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  const blocked = ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"];
  if (blocked.some((d) => host === d || host.endsWith(`.${d}`))) return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

async function unregisterAppWorkers(): Promise<void> {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs
      .filter((r) => (r.active ?? r.installing ?? r.waiting)?.scriptURL.endsWith("/sw.js"))
      .map((r) => r.unregister()),
  );
}

const RELOAD_KEY = "yard.chunk-reload-at";

function isStaleChunkError(message: string): boolean {
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
    message,
  );
}

/** After a new deploy, old pages request page files that no longer exist. Reload once (at most every 10s) to pick up the new version. */
function reloadForStaleChunk(): void {
  const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? "0");
  if (Date.now() - last < 10_000) return;
  sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  window.location.reload();
}

export function installStaleChunkRecovery(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    reloadForStaleChunk();
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason: unknown = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    if (isStaleChunkError(message)) reloadForStaleChunk();
  });
  window.addEventListener("error", (event) => {
    if (isStaleChunkError(event.message ?? "")) reloadForStaleChunk();
  });
}

export function registerServiceWorker(): void {
  installStaleChunkRecovery();
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (isRefusedContext()) {
    void unregisterAppWorkers();
    return;
  }
  void navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

/** For error screens: returns true when the error is a stale page file and a reload was started. */
export function recoverFromStaleChunk(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  if (!isStaleChunkError(message)) return false;
  reloadForStaleChunk();
  return true;
}
