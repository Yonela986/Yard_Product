import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";

import { useLandlord } from "../hooks";
import { Loading } from "./Loading";
import { useRedirectWhen } from "./useRedirect";

/** Use inside RequireAuth. */
export function RequireOnboarded({ children }: { children: ReactNode }) {
  const landlord = useLandlord();
  const needsOnboarding = landlord.isSuccess && !landlord.data?.onboarding_completed_at;
  useRedirectWhen(needsOnboarding, "/onboarding");
  if (landlord.isPending) return <Loading />;
  if (landlord.isError) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-start gap-4 px-gutter pt-16">
        <p className="text-body text-ink">Your details did not load. Check your connection.</p>
        <Button variant="secondary" onClick={() => void landlord.refetch()}>
          Try again
        </Button>
      </main>
    );
  }
  if (needsOnboarding) return <Loading />;
  return <>{children}</>;
}
