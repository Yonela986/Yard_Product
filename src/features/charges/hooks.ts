import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/features/auth/useAuth";

import {
  generateRentCharges,
  listMonthCharges,
  listPeriodPayments,
  listTenantBalances,
  listTenantCharges,
  updateCharge,
} from "./api";

export function useTenantBalances() {
  return useQuery({
    queryKey: queryKeys.charges.balances,
    queryFn: listTenantBalances,
  });
}

export function useMonthCharges(period: string) {
  return useQuery({
    queryKey: queryKeys.charges.month(period),
    queryFn: () => listMonthCharges(period),
    enabled: period.length > 0,
  });
}

export function usePeriodPayments(period: string) {
  return useQuery({
    queryKey: queryKeys.payments.month(period),
    queryFn: () => listPeriodPayments(period),
    enabled: period.length > 0,
  });
}

export function useTenantCharges(tenantId: string) {
  return useQuery({
    queryKey: queryKeys.charges.tenant(tenantId),
    queryFn: () => listTenantCharges(tenantId),
    enabled: tenantId.length > 0,
  });
}

export async function invalidateGeneratedChargeData(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.charges.balances }),
    queryClient.invalidateQueries({ queryKey: queryKeys.charges.all }),
    queryClient.invalidateQueries({ queryKey: ["statement"] }),
  ]);
}

export async function generateChargesAfterTenantChange(queryClient: QueryClient): Promise<void> {
  try {
    const created = await generateRentCharges();
    if (created > 0) await invalidateGeneratedChargeData(queryClient);
  } catch (error) {
    console.error(
      "Rent charge generation failed; it will be retried on the next landlord-area load.",
      error,
    );
  }
}

export function useUpdateCharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      chargeId,
      input,
    }: {
      chargeId: string;
      input: Parameters<typeof updateCharge>[1];
    }) => updateCharge(chargeId, input),
    onSuccess: async (charge) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.charges.balances }),
        queryClient.invalidateQueries({ queryKey: queryKeys.charges.month(charge.period) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.charges.tenant(charge.tenant_id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.charges.statement(charge.tenant_id) }),
      ]);
    },
  });
}

export function useGenerateRentChargesOnMount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const generation = useQuery({
    queryKey: queryKeys.charges.generation(userId),
    queryFn: generateRentCharges,
    enabled: userId !== "",
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });

  useEffect(() => {
    if (generation.data && generation.data > 0) {
      void invalidateGeneratedChargeData(queryClient);
    }
  }, [generation.data, queryClient]);
}
