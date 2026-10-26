import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_landlord/tenants/$tenantId/")({
  validateSearch: (search: Record<string, unknown>) => ({
    added: search["added"] === true ? true : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Tenant · Yard" },
      { name: "description", content: "Tenant details and actions." },
      { property: "og:title", content: "Tenant · Yard" },
      { property: "og:description", content: "Tenant details and actions." },
    ],
  }),
  component: lazyRouteComponent(() => import("@/pages/landlord/TenantDetail")),
});
