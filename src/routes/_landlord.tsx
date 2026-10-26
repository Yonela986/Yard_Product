import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { RequireOnboarded } from "@/features/auth/components/RequireOnboarded";

// Pathless layout: landlord pages with the bottom nav, behind both guards.
export const Route = createFileRoute("/_landlord")({
  component: LandlordLayout,
});

function LandlordLayout() {
  return (
    <RequireAuth>
      <RequireOnboarded>
        <AppShell />
      </RequireOnboarded>
    </RequireAuth>
  );
}
