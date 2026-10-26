import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_landlord/tenants/")({
  head: () => ({
    meta: [
      { title: "Tenants · Yard" },
      { name: "description", content: "Search tenants and review their current rent status." },
      { property: "og:title", content: "Tenants · Yard" },
      { property: "og:description", content: "Search tenants and review their current rent status." },
    ],
  }),
  component: lazyRouteComponent(() => import("@/pages/landlord/Tenants")),
});
