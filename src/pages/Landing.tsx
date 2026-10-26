import { useEffect, useState } from "react";
import { Banknote, Droplets, Link2, MessageCircle, ReceiptText, UserRoundPlus } from "lucide-react";

import { LEGAL_PAGES_READY } from "@/config";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { StepFlow } from "@/components/ui/StepFlow";
import { paths } from "@/router/paths";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function Landing() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  return (
    <div className="min-h-dvh bg-ground px-gutter text-left text-ink">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-ground focus:px-4 focus:py-2 focus:underline"
        href="#main-content"
      >
        Skip to content
      </a>
      <header className="yard-landing-header mx-auto flex min-h-16 max-w-3xl items-center justify-between border-b border-line">
        <a className="text-body font-semibold text-ink no-underline" href={paths.landing}>
          Yard
        </a>
        <a
          className="inline-flex min-h-11 items-center justify-center rounded-sm border border-line-strong bg-ground px-4 text-body font-semibold text-ink"
          href={paths.SIGN_IN}
        >
          Sign in
        </a>
      </header>
      <main id="main-content" className="yard-landing-content mx-auto max-w-3xl pb-12">
        <section className="yard-landing-hero space-y-5 border-b border-line py-14 md:py-20">
          <h1 className="max-w-lg text-title font-semibold text-ink">
            Rent records for backyard rooms
          </h1>
          <p>
            Yard helps landlords with 2 to 12 rooms keep track of who has paid, split electricity
            and water fairly, and send receipts and reminders on WhatsApp.
          </p>
          <div className="space-y-3">
            <a
              className="inline-flex min-h-12 w-full items-center justify-center rounded-sm border border-brand bg-brand px-4 text-body font-semibold text-on-brand"
              href={paths.SIGN_IN}
            >
              Get started
            </a>
            <p>
              <a className="text-ink underline" href={paths.SIGN_IN}>
                Already use Yard? Sign in
              </a>
            </p>
          </div>
        </section>

        <section className="space-y-4 border-b border-line py-8">
          <h2 className="text-body font-semibold text-ink">What you can do</h2>
          <ul className="grid gap-3">
            <FeatureCard
              icon={Banknote}
              title="See who has paid."
              line="Every tenant shows as paid, part paid, late or not due yet, with what they owe."
            />
            <FeatureCard
              icon={ReceiptText}
              title="Record payments and give receipts."
              line="Each receipt has its own number and can be downloaded as a PDF."
            />
            <FeatureCard
              icon={Droplets}
              title="Split electricity and water."
              line="Choose equal shares, usage from meter readings, or your own amounts. Tenants can see how their share was worked out."
            />
            <FeatureCard
              icon={MessageCircle}
              title="Remind tenants on WhatsApp."
              line="Yard writes the message for you. You press send."
            />
            <FeatureCard
              icon={Link2}
              title="Give every tenant a private link."
              line="They see their balance, charges and receipts on their phone, with no app and no account."
            />
          </ul>
        </section>

        <section className="space-y-4 border-b border-line py-8">
          <h2 className="text-body font-semibold text-ink">How it works</h2>
          <StepFlow
            steps={[
              {
                icon: UserRoundPlus,
                title: "Sign in with your cellphone number.",
                line: "We send you a code by SMS.",
              },
              {
                icon: Banknote,
                title: "Add your rooms and tenants.",
                line: "It takes about two minutes.",
              },
              {
                icon: ReceiptText,
                title: "Each month,",
                line: "record payments and send reminders.",
              },
            ]}
          />
        </section>

        <section className="space-y-3 border-b border-line py-8">
          <h2 className="text-body font-semibold text-ink">If you are a tenant</h2>
          <p>
            If your landlord uses Yard, open the link they sent you on WhatsApp. You do not need to
            sign up or install anything.
          </p>
        </section>

        <section className="space-y-3 border-b border-line py-8">
          <h2 className="text-body font-semibold text-ink">Works with WhatsApp</h2>
          <p>
            Yard is not a WhatsApp bot and does not send messages for you. It opens WhatsApp with
            the message already written, and you press send from your own phone.
          </p>
        </section>

        <section className="space-y-3 border-b border-line py-8">
          <h2 className="text-body font-semibold text-ink">Put Yard on your phone</h2>
          <p>
            Yard works in your phone’s browser and can be installed like an app. On Android in
            Chrome, open the menu and tap Install app or Add to Home screen. On iPhone in Safari,
            tap Share, then Add to Home Screen.
          </p>
          {installPrompt && (
            <button
              type="button"
              className="inline-flex min-h-12 items-center justify-center rounded-sm border border-line-strong bg-ground px-4 text-body font-semibold text-ink underline"
              onClick={() => void install()}
            >
              Install Yard
            </button>
          )}
        </section>

        <section className="space-y-3 border-b border-line py-8">
          <h2 className="text-body font-semibold text-ink">Your tenants’ details</h2>
          <p>
            Only you can see your rooms, tenants and payments. Each tenant’s link is private, and
            you can replace it at any time.
          </p>
        </section>

        <section className="space-y-4 py-8">
          <a
            className="inline-flex min-h-12 w-full items-center justify-center rounded-sm border border-brand bg-brand px-4 text-body font-semibold text-on-brand"
            href={paths.SIGN_IN}
          >
            Get started
          </a>
        </section>
      </main>
      <footer className="mx-auto flex min-h-14 max-w-3xl items-center justify-between border-t border-line py-3 text-secondary text-ink">
        <span>Yard</span>
        {LEGAL_PAGES_READY && (
          <nav aria-label="Legal">
            <ul className="flex gap-4">
              <li>
                <a className="underline" href="/privacy">
                  Privacy
                </a>
              </li>
              <li>
                <a className="underline" href="/terms">
                  Terms
                </a>
              </li>
            </ul>
          </nav>
        )}
      </footer>
    </div>
  );
}
