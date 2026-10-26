import { Link, Outlet } from "@tanstack/react-router";
import {
  Banknote,
  ChartNoAxesCombined,
  ClipboardCheck,
  DoorClosed,
  House,
  Sprout,
  UsersRound,
} from "lucide-react";

import { BottomNav } from "@/components/ui/BottomNav";
import { useGenerateRentChargesOnMount } from "@/features/charges/hooks";
import { paths } from "@/router/paths";

const navItems = [
  { to: paths.home, label: "Dashboard", Icon: House },
  { to: paths.rooms, label: "Rooms", Icon: DoorClosed },
  { to: paths.tenants, label: "Tenants", Icon: UsersRound },
  { to: paths.money, label: "Money", Icon: Banknote },
  { to: paths.incomeReport, label: "Reports", Icon: ChartNoAxesCombined },
  { to: paths.pendingPayments, label: "Payments", Icon: ClipboardCheck },
] as const;

export function AppShell() {
  useGenerateRentChargesOnMount();

  return (
    <div className="min-h-dvh bg-ground pt-safe">
      <aside className="yard-sidebar fixed inset-y-0 left-0 z-40 hidden w-64 flex-col px-4 py-6 md:flex">
        <Link to={paths.home} className="mb-9 flex items-center gap-3 rounded-xl px-2 py-1 text-ink no-underline">
          <span className="yard-brand-mark flex size-11 items-center justify-center rounded-xl text-on-brand">
            <Sprout aria-hidden="true" className="size-5" strokeWidth={1.8} />
          </span>
          <span className="min-w-0">
            <span className="block text-title font-semibold leading-tight tracking-tight">Yard</span>
            <span className="mt-1 block text-secondary text-ink-muted">Rental workspace</span>
          </span>
        </Link>

        <p className="mb-2 px-3 text-secondary font-semibold uppercase tracking-[0.12em] text-ink-muted">
          Workspace
        </p>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {navItems.map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to !== paths.rooms && to !== paths.tenants }}
              className="yard-nav-link group flex min-h-12 items-center gap-3 rounded-xl px-3 text-body font-medium text-ink-muted"
              activeProps={{
                className: "yard-nav-link bg-brand-tint text-brand font-semibold",
                "aria-current": "page",
              }}
            >
              <Icon aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.8} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl border border-[#dce8de] bg-gradient-to-br from-[#f0f6f0] to-[#fafaf7] p-4">
          <p className="text-body font-semibold text-ink">A clearer view of your rentals.</p>
          <p className="mt-1 text-secondary text-ink-muted">
            Keep rooms, rent and tenant payments in one place.
          </p>
        </div>
      </aside>

      <div className="min-w-0 md:pl-64">
        <header className="yard-topbar sticky top-0 z-20 hidden h-16 items-center justify-between border-b border-line px-6 lg:px-10 md:flex">
          <p className="text-secondary text-ink-muted">Your rental business, at a glance.</p>
          <Link
            to={paths.pendingPayments}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-white px-4 text-secondary font-semibold text-ink shadow-sm transition-all hover:border-[#b9cebf] hover:bg-[#f5f8f4]"
          >
            <ClipboardCheck aria-hidden="true" className="size-4 text-brand" />
            Review payments
          </Link>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 pb-[calc(72px+16px+env(safe-area-inset-bottom))] sm:px-6 md:px-8 md:pb-10 lg:px-10 xl:px-12">
          <Outlet />
        </main>
      </div>

      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
