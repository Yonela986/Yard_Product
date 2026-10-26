import { Link } from "@tanstack/react-router";
import { Banknote, DoorClosed, House, Settings } from "lucide-react";

import { paths } from "@/router/paths";

const items = [
  { to: paths.home, label: "Home", Icon: House },
  { to: paths.rooms, label: "Rooms", Icon: DoorClosed },
  { to: paths.money, label: "Money", Icon: Banknote },
  { to: paths.settings, label: "Settings", Icon: Settings },
] as const;

export function BottomNav() {
  return (
    <nav
      aria-label="Main"
      className="yard-bottom-nav fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-safe backdrop-blur-xl"
    >
      <ul className="mx-auto grid max-w-2xl grid-cols-4">
        {items.map(({ to, label, Icon }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: false }}
              className="group relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-secondary text-ink-muted transition-colors"
              activeProps={{ className: "text-brand font-semibold", "aria-current": "page" }}
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-4 top-0 h-0.5 bg-transparent group-aria-[current=page]:bg-brand"
              />
              <Icon aria-hidden="true" className="size-6" strokeWidth={1.5} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
