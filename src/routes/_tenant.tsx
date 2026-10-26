import { createFileRoute } from "@tanstack/react-router";

import { TenantShell } from "@/components/layout/TenantShell";

export const Route = createFileRoute("/_tenant")({
  component: TenantShell,
});
