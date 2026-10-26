import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/_landlord/tenants/new")({
  validateSearch: z.object({ roomId: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "New tenant · Yard" },
      { name: "description", content: "Add a tenant to a room." },
      { property: "og:title", content: "New tenant · Yard" },
      { property: "og:description", content: "Add a tenant to a room." },
    ],
  }),
  component: lazyRouteComponent(() => import("@/pages/landlord/TenantForm")),
});
