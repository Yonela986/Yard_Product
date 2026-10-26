import { Link } from "@tanstack/react-router";

import { paths } from "@/router/paths";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-gutter">
      <h1 className="text-title font-semibold text-ink">Not found</h1>
      <p className="text-body text-ink-muted">This page does not exist.</p>
      <Link
        to={paths.home}
        className="inline-flex min-h-12 w-fit items-center rounded-sm border border-line-strong px-4 font-semibold text-ink"
      >
        Go to Home
      </Link>
    </main>
  );
}
