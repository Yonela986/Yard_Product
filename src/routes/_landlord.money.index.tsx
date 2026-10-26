import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_landlord/money/")({
  head: () => ({
    meta: [
      { title: "Money · Yard" },
      { name: "description", content: "Charges, payments received and what is still owed." },
      { property: "og:title", content: "Money · Yard" },
      { property: "og:description", content: "Charges, payments received and what is still owed." },
    ],
  }),
  component: lazyRouteComponent(() => import("@/pages/landlord/Money")),
});
