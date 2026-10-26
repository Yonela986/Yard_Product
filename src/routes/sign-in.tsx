import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

import { safeRedirect } from "@/features/auth/schema";

const SignIn = lazyRouteComponent(() => import("@/pages/SignIn"));

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const redirect = safeRedirect(search["redirect"]);
    return redirect ? { redirect } : {};
  },
  head: () => ({
    meta: [
      { title: "Sign in · Yard" },
      { name: "description", content: "Sign in to Yard with your mobile number." },
      { property: "og:title", content: "Sign in · Yard" },
      { property: "og:description", content: "Sign in to Yard with your mobile number." },
    ],
  }),
  component: SignInRoute,
});

function SignInRoute() {
  const { redirect } = Route.useSearch();
  return <SignIn redirect={redirect} />;
}
