import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";

import { fetchLandlord, updateLandlordPreferences } from "./api";
import { useAuth } from "./useAuth";
import type { Language, ReminderTone } from "@/types/domain";

/** The signed-in user's landlord row, or null if onboarding has not created one yet. */
export function useLandlord() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  return useQuery({
    queryKey: queryKeys.landlord.me(userId),
    queryFn: () => fetchLandlord(userId),
    enabled: userId !== "",
  });
}

export function useUpdateLandlordPreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (preferences: {
      language?: Language;
      reminder_tone?: ReminderTone;
      upcoming_reminder_days?: number;
    }) => {
      if (!user?.id) throw new Error("Sign in to update your message preferences");
      return updateLandlordPreferences(user.id, preferences);
    },
    onSuccess: async () => {
      if (user?.id)
        await queryClient.invalidateQueries({ queryKey: queryKeys.landlord.me(user.id) });
    },
  });
}
