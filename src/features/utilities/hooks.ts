import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";

import {
  createUtilityBill,
  getLatestMeterReadings,
  getUtilityBill,
  listUtilityBills,
  listUtilityRooms,
  undoUtilityBill,
} from "./api";
import type { UtilityBillPayload } from "./split";
import type { UtilityType } from "@/types/domain";

export function useUtilityRooms(propertyId: string) {
  return useQuery({
    queryKey: [...queryKeys.rooms.property, "utility", propertyId],
    queryFn: () => listUtilityRooms(propertyId),
    enabled: propertyId.length > 0,
  });
}

export function useUtilityBills(propertyId: string) {
  return useQuery({
    queryKey: queryKeys.utilities.bills(propertyId),
    queryFn: () => listUtilityBills(propertyId),
    enabled: propertyId.length > 0,
  });
}

export function useUtilityBill(billId: string) {
  return useQuery({
    queryKey: queryKeys.utilities.bill(billId),
    queryFn: () => getUtilityBill(billId),
    enabled: billId.length > 0,
  });
}

export function useLatestMeterReadings(roomIds: string[], type: UtilityType) {
  const stableRoomIds = [...roomIds].sort();
  return useQuery({
    queryKey: queryKeys.utilities.readings(type, stableRoomIds),
    queryFn: () => getLatestMeterReadings(stableRoomIds, type),
    enabled: stableRoomIds.length > 0,
  });
}

export function useCreateUtilityBill(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UtilityBillPayload) => createUtilityBill(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.charges.balances }),
        queryClient.invalidateQueries({ queryKey: queryKeys.charges.all }),
        queryClient.invalidateQueries({ queryKey: ["statement"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.utilities.bills(propertyId) }),
        queryClient.invalidateQueries({ queryKey: ["meter-readings"] }),
      ]);
    },
  });
}

export function useUndoUtilityBill(propertyId: string, billId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: undoUtilityBill,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.charges.balances }),
        queryClient.invalidateQueries({ queryKey: queryKeys.charges.all }),
        queryClient.invalidateQueries({ queryKey: ["statement"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.utilities.bills(propertyId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.utilities.bill(billId) }),
        queryClient.invalidateQueries({ queryKey: ["meter-readings"] }),
      ]);
    },
  });
}
