import { useFormContext } from "react-hook-form";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LANGUAGE_LABELS } from "@/types/domain";

import { LANGUAGES, type OnboardingFormValues } from "../schema";

export function AboutStep() {
  const { register, formState } = useFormContext<OnboardingFormValues>();
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-body font-semibold text-ink">About you</h2>
      <Input
        label="Your name"
        autoComplete="name"
        error={formState.errors.name?.message}
        {...register("name")}
      />
      <Select
        label="Language"
        helper="Used for WhatsApp messages to your tenants."
        options={LANGUAGES.map((l) => ({ value: l, label: LANGUAGE_LABELS[l] }))}
        {...register("language")}
      />
    </div>
  );
}
