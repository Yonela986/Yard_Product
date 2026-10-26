import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/_landlord/remind")({
  head: () => ({
    meta: [
      { title: "Rent reminders · Yard" },
      { name: "description", content: "Send WhatsApp reminders for rent due soon and late rent." },
    ],
  }),
  component: lazyRouteComponent(() => import("@/pages/landlord/RemindLate")),
});
