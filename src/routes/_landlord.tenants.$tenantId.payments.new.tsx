import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_landlord/tenants/$tenantId/payments/new")({
  head: () => ({
    meta: [
      { title: "Record payment · Yard" },
      { name: "description", content: "Record a tenant payment." },
    ],
  }),
  component: lazyRouteComponent(() => import("@/pages/landlord/RecordPayment")),
});
