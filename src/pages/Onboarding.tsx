import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { Loading } from "@/features/auth/components/Loading";
import { useLandlord } from "@/features/auth/hooks";
import { AboutStep } from "@/features/onboarding/components/AboutStep";
import { PropertyStep } from "@/features/onboarding/components/PropertyStep";
import { RoomsStep } from "@/features/onboarding/components/RoomsStep";
import { loadDraft, saveDraft, useCompleteOnboarding } from "@/features/onboarding/hooks";
import {
  emptyOnboarding,
  onboardingSchema,
  toRoomPayload,
  type OnboardingFormValues,
} from "@/features/onboarding/schema";

type Step = 1 | 2 | 3;
const STEP_FIELDS: Record<1 | 2, (keyof OnboardingFormValues)[]> = {
  1: ["name", "language"],
  2: ["propertyName", "address"],
};

export default function Onboarding() {
  const landlord = useLandlord();
  const navigate = useNavigate();
  const submit = useCompleteOnboarding();
  const [step, setStep] = useState<Step>(1);
  const [restored, setRestored] = useState(false);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: emptyOnboarding(),
    mode: "onTouched",
  });

  // Restore the draft after mount (localStorage is browser-only).
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      form.reset(draft.values);
      setStep(draft.step);
    }
    setRestored(true);
  }, [form]);

  const values = useWatch({ control: form.control });
  useEffect(() => {
    if (restored && !submit.isSuccess) {
      saveDraft({ step, values: { ...emptyOnboarding(), ...values } as OnboardingFormValues });
    }
  }, [values, step, restored, submit.isSuccess]);

  const completed = Boolean(landlord.data?.onboarding_completed_at);
  useEffect(() => {
    if (completed) void navigate({ to: "/home", replace: true });
  }, [completed, navigate]);

  if (landlord.isPending || completed || !restored) return <Loading />;

  async function next() {
    if (step === 3) return;
    const ok = await form.trigger(STEP_FIELDS[step]);
    if (ok) {
      setStep((step + 1) as Step);
      window.scrollTo(0, 0);
    }
  }

  const onSubmit = form.handleSubmit((v) => {
    submit.mutate(
      {
        name: v.name,
        language: v.language,
        propertyName: v.propertyName,
        address: v.address,
        rooms: v.rooms.map(toRoomPayload),
      },
      { onSuccess: () => void navigate({ to: "/home", replace: true }) },
    );
  });

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-gutter pt-12 pb-[calc(32px+env(safe-area-inset-bottom))]">
      <div className="flex flex-col gap-1">
        <p className="text-body font-semibold text-ink">Yard</p>
        <p className="text-secondary text-ink-muted">Step {step} of 3</p>
        <h1 className="text-title font-semibold text-ink">Set up Yard</h1>
      </div>
      <FormProvider {...form}>
        <form
          noValidate
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (step === 3) void onSubmit(e);
            else void next();
          }}
        >
          {step === 1 && <AboutStep />}
          {step === 2 && <PropertyStep />}
          {step === 3 && <RoomsStep />}

          {submit.isError && (
            <div className="flex flex-col items-start gap-2 rounded-md border border-line-strong bg-surface p-4">
              <p className="text-body text-ink">
                Your details were not saved. Your answers are still here.
              </p>
              <Button variant="secondary" onClick={() => void onSubmit()}>
                Try again
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button type="submit" fullWidth loading={submit.isPending} loadingLabel="Saving">
              {step === 3 ? "Finish" : "Continue"}
            </Button>
            {step > 1 && (
              <Button
                variant="quiet"
                className="w-fit px-0"
                disabled={submit.isPending}
                onClick={() => setStep((step - 1) as Step)}
              >
                Back
              </Button>
            )}
          </div>
        </form>
      </FormProvider>
    </main>
  );
}
