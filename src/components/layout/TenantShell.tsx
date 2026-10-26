import { Outlet } from "@tanstack/react-router";

export function TenantShell() {
  return (
    <div className="min-h-dvh pt-safe">
      <header className="yard-public-header">
        <div className="mx-auto flex min-h-14 max-w-2xl items-center px-gutter">
          <span className="text-body font-semibold text-ink">Yard</span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-gutter pb-safe">
        <Outlet />
      </main>
    </div>
  );
}
