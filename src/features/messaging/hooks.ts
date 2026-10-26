import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";

import { listRecentMessageLog, recordMessageOpened, type RecordMessageInput } from "./api";

export function useRecentMessageLog() {
  return useQuery({
    queryKey: queryKeys.messaging.recent,
    queryFn: listRecentMessageLog,
    staleTime: 0,
  });
}

export function useRecordMessageOpened() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordMessageInput) => recordMessageOpened(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.messaging.recent });
    },
  });
}
