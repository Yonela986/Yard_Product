import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_tenant/t/$token")({
  head: () => ({
    meta: [
      { title: "Your rent · Yard" },
      { name: "description", content: "Your rent, payments and receipts." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Your rent · Yard" },
      { property: "og:description", content: "Your rent, payments and receipts." },
    ],
  }),
  component: lazyRouteComponent(() => import("@/pages/tenant/TenantPage")),
});
