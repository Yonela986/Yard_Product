import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-600.css";

import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { envResult } from "@/lib/env";
import { recoverFromStaleChunk, registerServiceWorker } from "@/lib/pwa";
import NotFound from "@/pages/NotFound";

import { reportLovableError } from "../lib/lovable-error-reporting";
import appCss from "../styles/index.css?url";

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    if (recoverFromStaleChunk(error)) return;
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-gutter">
      <h1 className="text-title font-semibold text-ink">This page did not load</h1>
      <p className="text-body text-ink-muted">Something went wrong. Try again in a moment.</p>
      <Button
        className="w-fit"
        onClick={() => {
          void router.invalidate();
          reset();
        }}
      >
        Try again
      </Button>
    </main>
  );
}

function MissingEnv({ missing }: { missing: string[] }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-gutter">
      <h1 className="text-title font-semibold text-ink">Yard is not configured</h1>
      <p className="text-body text-ink">
        Missing or invalid environment variable: <strong>{missing.join(", ")}</strong>
      </p>
      <p className="text-secondary text-ink-muted">
        Add it to .env.local for development, or to the site settings on Netlify, then rebuild.
      </p>
    </main>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#FAFAF7" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Yard" },
      { title: "Yard" },
      { name: "description", content: "Rent and tenant management for backyard-room landlords." },
      { property: "og:title", content: "Yard" },
      {
        property: "og:description",
        content: "Rent and tenant management for backyard-room landlords.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icons/icon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon-180.png", sizes: "180x180" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en-ZA">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    registerServiceWorker();
  }, []);

  if (!envResult.ok) return <MissingEnv missing={envResult.missing} />;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </QueryClientProvider>
  );
}
