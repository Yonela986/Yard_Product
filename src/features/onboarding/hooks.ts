import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";

import { completeOnboarding, type CompleteOnboardingInput } from "./api";
import { emptyOnboarding, onboardingSchema, type OnboardingFormValues } from "./schema";

export const DRAFT_KEY = "yard.onboarding.draft";

export interface OnboardingDraft {
  step: 1 | 2 | 3;
  values: OnboardingFormValues;
}

export function loadDraft(): OnboardingDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft>;
    const base = emptyOnboarding();
    const values = { ...base, ...parsed.values } as OnboardingFormValues;
    if (!Array.isArray(values.rooms) || values.rooms.length === 0) values.rooms = base.rooms;
    if (!onboardingSchema.shape.language.safeParse(values.language).success) {
      values.language = "en";
    }
    const step = parsed.step === 2 || parsed.step === 3 ? parsed.step : 1;
    return { step, values };
  } catch {
    return null;
  }
}

export function saveDraft(draft: OnboardingDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Storage full or blocked: the form still works, only the draft is lost.
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CompleteOnboardingInput) => completeOnboarding(input),
    onSuccess: async () => {
      clearDraft();
      await queryClient.invalidateQueries({ queryKey: queryKeys.landlord.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all });
    },
  });
}
