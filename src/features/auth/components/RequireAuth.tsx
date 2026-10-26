import { useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { useAuth } from "../useAuth";
import { Loading } from "./Loading";
import { useRedirectWhen } from "./useRedirect";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth();
  const href = useLocation({ select: (l) => l.href });
  useRedirectWhen(!isLoading && !session, "/sign-in", href);
  if (isLoading || !session) return <Loading />;
  return <>{children}</>;
}
