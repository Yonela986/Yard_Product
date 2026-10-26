import { createFileRoute } from "@tanstack/react-router";
import { landingSeo } from "@/lib/landingSeo";
import RootPage from "@/pages/Root";

const seo = landingSeo(import.meta.env["VITE_PUBLIC_APP_URL"]);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Yard — rent records for backyard rooms" },
      {
        name: "description",
        content:
          "Yard helps landlords with 2 to 12 rooms keep track of who has paid, split electricity and water fairly, and send receipts and reminders on WhatsApp.",
      },
      {
        property: "og:title",
        content: "Yard — rent records for backyard rooms",
      },
      {
        property: "og:description",
        content:
          "Yard helps landlords with 2 to 12 rooms keep track of who has paid, split electricity and water fairly, and send receipts and reminders on WhatsApp.",
      },
      { property: "og:type", content: "website" },
      ...(seo ? [{ property: "og:url", content: seo.canonical }] : []),
      ...(seo ? [{ property: "og:image", content: seo.image }] : []),
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: seo ? [{ rel: "canonical", href: seo.canonical }] : [],
  }),
  component: RootPage,
});
