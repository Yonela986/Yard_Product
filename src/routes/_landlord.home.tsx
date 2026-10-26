import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_landlord/home")({
  head: () => ({
    meta: [
      { title: "Home · Yard" },
      { name: "description", content: "Rent status for your backyard rooms this month." },
      { property: "og:title", content: "Home · Yard" },
      { property: "og:description", content: "Rent status for your backyard rooms this month." },
    ],
  }),
  component: lazyRouteComponent(() => import("@/pages/landlord/Home")),
});
