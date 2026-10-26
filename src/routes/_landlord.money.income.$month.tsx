import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_landlord/money/income/$month")({
  component: lazyRouteComponent(() => import("@/pages/landlord/IncomeMonth")),
});
