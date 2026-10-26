import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_landlord/tenants/$tenantId/payments/$paymentId")({
  validateSearch: (search: Record<string, unknown>) => ({
    recorded: typeof search["recorded"] === "string" ? search["recorded"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Payment · Yard" },
      { name: "description", content: "Payment details and receipt." },
    ],
  }),
  component: lazyRouteComponent(() => import("@/pages/landlord/PaymentDetail")),
});
