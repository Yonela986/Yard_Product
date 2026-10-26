import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_landlord/tenants/$tenantId/edit")({
  head: () => ({
    meta: [
      { title: "Edit tenant · Yard" },
      { name: "description", content: "Edit tenant details." },
      { property: "og:title", content: "Edit tenant · Yard" },
      { property: "og:description", content: "Edit tenant details." },
    ],
  }),
  component: lazyRouteComponent(() => import("@/pages/landlord/TenantForm")),
});
