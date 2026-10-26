import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

import { RequireAuth } from "@/features/auth/components/RequireAuth";

const Onboarding = lazyRouteComponent(() => import("@/pages/Onboarding"));

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up · Yard" },
      { name: "description", content: "Add your details, property and rooms." },
      { property: "og:title", content: "Set up · Yard" },
      { property: "og:description", content: "Add your details, property and rooms." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Onboarding />
    </RequireAuth>
  ),
});
