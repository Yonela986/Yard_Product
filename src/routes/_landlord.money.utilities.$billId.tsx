import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_landlord/money/utilities/$billId")({
  component: lazyRouteComponent(() => import("@/pages/landlord/UtilityDetail")),
});
