import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_landlord/money/utilities/")({
  component: lazyRouteComponent(() => import("@/pages/landlord/Utilities")),
});
