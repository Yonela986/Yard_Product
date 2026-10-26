import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

/** Navigates once when `when` becomes true. Avoids render-time redirect loops. */
export function useRedirectWhen(when: boolean, to: "/sign-in" | "/onboarding", redirect?: string) {
  const navigate = useNavigate();
  const done = useRef(false);
  useEffect(() => {
    if (!when || done.current) return;
    done.current = true;
    void navigate({ to, search: redirect ? { redirect } : {}, replace: true });
  }, [when, to, redirect, navigate]);
}
