import { supabase } from "@/lib/supabase";
import type { Language, OnboardingRoomInput } from "@/types/domain";

export interface CompleteOnboardingInput {
  name: string;
  language: Language;
  propertyName: string;
  address: string;
  rooms: OnboardingRoomInput[];
}

export async function completeOnboarding(input: CompleteOnboardingInput): Promise<void> {
  const { error } = await supabase.rpc("complete_onboarding", {
    p_name: input.name.trim(),
    p_language: input.language,
    p_property_name: input.propertyName.trim(),
    p_address: input.address.trim(),
    p_rooms: input.rooms,
  });
  // Already completed (for example a double submit) counts as success.
  if (error && !error.message.includes("Onboarding already completed")) throw error;
}
