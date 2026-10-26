import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { CodeStep } from "@/features/auth/components/CodeStep";
import { Loading } from "@/features/auth/components/Loading";
import { PhoneStep } from "@/features/auth/components/PhoneStep";
import { safeRedirect } from "@/features/auth/schema";
import { useAuth } from "@/features/auth/useAuth";
import type { SAPhone } from "@/lib/phone";
import { paths } from "@/router/paths";

export default function SignIn({ redirect }: { redirect?: string | undefined }) {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState<SAPhone | null>(null);
  const [typed, setTyped] = useState("");

  const target = safeRedirect(redirect) ?? paths.home;

  useEffect(() => {
    if (session) router.history.replace(target);
  }, [session, router, target]);

  if (isLoading || session) return <Loading />;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-gutter py-12 pb-safe">
      <header>
        <Link to={paths.landing} className="text-body font-semibold text-ink underline">
          Yard
        </Link>
      </header>
      <section className="yard-auth-panel flex flex-col gap-5">
        <div>
          <p className="yard-eyebrow mb-2">Welcome back</p>
          <h1 className="text-title font-semibold text-ink">Sign in</h1>
        </div>
        {phone ? (
          <CodeStep
            phone={phone}
            onVerified={() => router.history.replace(target)}
            onChangeNumber={() => setPhone(null)}
          />
        ) : (
          <>
            <p className="text-body text-ink-muted">We will send a 6-digit code to your phone.</p>
            <PhoneStep
              initial={typed}
              onSent={(p, t) => {
                setTyped(t);
                setPhone(p);
              }}
            />
          </>
        )}
      </section>
    </main>
  );
}
