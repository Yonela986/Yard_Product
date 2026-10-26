import { createFileRoute, lazyRouteComponent, notFound } from "@tanstack/react-router";

// Development only. In production builds import.meta.env.DEV is false, so the
// DevKit import is dropped and the route renders Not found.
export const Route = createFileRoute("/dev/kit")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  head: () => ({
    meta: [
      { title: "Development kit · Yard" },
      { name: "description", content: "Yard component kit for development." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Development kit · Yard" },
      { property: "og:description", content: "Yard component kit for development." },
    ],
  }),
  component: import.meta.env.DEV
    ? lazyRouteComponent(() => import("@/pages/dev/DevKit"))
    : () => null,
});
