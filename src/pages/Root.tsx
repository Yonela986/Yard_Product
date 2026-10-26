import { lazy, Suspense, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

import { useAuth } from "@/features/auth/useAuth";
import { useLandlord } from "@/features/auth/hooks";
import { paths } from "@/router/paths";

const Landing = lazy(() => import("./Landing"));

export default function RootPage() {
  const { user, isLoading } = useAuth();
  const landlord = useLandlord();
  const navigate = useNavigate();
  const onboardingComplete = Boolean(landlord.data?.onboarding_completed_at);

  useEffect(() => {
    if (isLoading || !user || landlord.isPending || landlord.isError) return;
    void navigate({
      to: onboardingComplete ? paths.home : paths.ONBOARDING,
      replace: true,
    });
  }, [isLoading, user, landlord.isPending, landlord.isError, onboardingComplete, navigate]);

  if (isLoading || (user && landlord.isPending)) {
    return <p className="min-h-dvh bg-ground px-gutter py-6 text-body text-ink">Loading</p>;
  }
  if (user && landlord.isError) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-3 px-gutter py-8">
        <p role="alert" className="text-body text-ink">
          Could not load this. Check your connection.
        </p>
        <button
          type="button"
          className="min-h-11 w-fit underline"
          onClick={() => void landlord.refetch()}
        >
          Try again
        </button>
      </main>
    );
  }
  if (user) {
    return <p className="min-h-dvh bg-ground px-gutter py-6 text-body text-ink">Loading</p>;
  }

  return (
    <Suspense
      fallback={<p className="min-h-dvh bg-ground px-gutter py-6 text-body text-ink">Loading</p>}
    >
      <Landing />
    </Suspense>
  );
}
