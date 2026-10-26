import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";

import { getPublicTenantCharges, getTenantPaymentInfo, submitTenantPayment } from "./api";

export function usePublicTenantCharges(token: string) {
  return useQuery({
    queryKey: queryKeys.tenants.publicCharges(token),
    queryFn: () => getPublicTenantCharges(token),
    enabled: token.length > 0,
  });
}

export function useTenantPaymentInfo(token: string) {
  return useQuery({
    queryKey: queryKeys.tenants.paymentInfo(token),
    queryFn: () => getTenantPaymentInfo(token),
    enabled: token.length > 0,
  });
}

export function useSubmitTenantPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitTenantPayment,
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tenants.paymentInfo(input.token) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.tenants.publicPage(input.token) });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.tenants.publicReceipts(input.token),
      });
    },
  });
}
