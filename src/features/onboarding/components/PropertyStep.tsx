import { useFormContext } from "react-hook-form";

import { Input } from "@/components/ui/Input";

import type { OnboardingFormValues } from "../schema";

export function PropertyStep() {
  const { register, formState } = useFormContext<OnboardingFormValues>();
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-body font-semibold text-ink">Your property</h2>
      <Input
        label="Property name"
        helper="For example, your street or your surname"
        error={formState.errors.propertyName?.message}
        {...register("propertyName")}
      />
      <Input label="Address (optional)" autoComplete="street-address" {...register("address")} />
    </div>
  );
}
