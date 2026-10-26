import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_landlord/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Yard" },
      { name: "description", content: "Your Yard account and payment details." },
      { property: "og:title", content: "Settings · Yard" },
      { property: "og:description", content: "Your Yard account and payment details." },
    ],
  }),
  component: lazyRouteComponent(() => import("@/pages/landlord/Settings")),
});
