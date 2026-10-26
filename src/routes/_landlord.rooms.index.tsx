import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_landlord/rooms/")({
  head: () => ({
    meta: [
      { title: "Rooms · Yard" },
      { name: "description", content: "Your rooms and the tenants in them." },
      { property: "og:title", content: "Rooms · Yard" },
      { property: "og:description", content: "Your rooms and the tenants in them." },
    ],
  }),
  component: lazyRouteComponent(() => import("@/pages/landlord/Rooms")),
});
