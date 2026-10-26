import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_landlord/payments/pending")({
  head: () => ({
    meta: [
      { title: "Payments waiting · Yard" },
      { name: "description", content: "Review tenant payment notices." },
    ],
  }),
  component: lazyRouteComponent(() => import("@/pages/landlord/PendingPayments")),
});
