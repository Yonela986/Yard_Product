import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_landlord/rooms/$roomId")({
  head: () => ({
    meta: [
      { title: "Room · Yard" },
      { name: "description", content: "Room details and tenant history." },
      { property: "og:title", content: "Room · Yard" },
      { property: "og:description", content: "Room details and tenant history." },
    ],
  }),
  component: lazyRouteComponent(() => import("@/pages/landlord/RoomDetail")),
});
