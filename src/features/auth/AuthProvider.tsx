import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { supabase } from "@/lib/supabase";

import { signOut as apiSignOut } from "./api";
import { AuthContext, type AuthState } from "./useAuth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // Listener first, then restore, so no event is missed.
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      setSession(next);
      setIsLoading(false);
      if (event === "SIGNED_OUT") queryClient.clear();
    });
    void supabase.auth.getSession().then(({ data: { session: restored } }) => {
      if (!active) return;
      setSession(restored);
      setIsLoading(false);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [queryClient]);

  const signOut = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await apiSignOut();
    setSession(null);
  }, [queryClient]);

  const value = useMemo<AuthState>(
    () => ({ session, user: session?.user ?? null, isLoading, signOut }),
    [session, isLoading, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
