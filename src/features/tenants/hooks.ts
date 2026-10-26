import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import { generateChargesAfterTenantChange } from "@/features/charges/hooks";

import {
  createTenant,
  getTenant,
  getPublicTenantPage,
  getPublicTenantReceipts,
  listCurrentTenants,
  listPreviousTenantsForRoom,
  listTenantsForRoom,
  moveOutTenant,
  regenerateTenantToken,
  updateTenant,
} from "./api";

export function useCurrentTenants() {
  return useQuery({ queryKey: queryKeys.tenants.current, queryFn: listCurrentTenants });
}

export function useTenantsForRoom(roomId: string) {
  return useQuery({
    queryKey: queryKeys.tenants.room(roomId),
    queryFn: () => listTenantsForRoom(roomId),
    enabled: roomId.length > 0,
  });
}

export function usePreviousTenantsForRoom(roomId: string) {
  return useQuery({
    queryKey: [...queryKeys.tenants.room(roomId), "previous"],
    queryFn: () => listPreviousTenantsForRoom(roomId),
    enabled: roomId.length > 0,
  });
}

export function useTenant(tenantId: string) {
  return useQuery({
    queryKey: queryKeys.tenants.detail(tenantId),
    queryFn: () => getTenant(tenantId),
    enabled: tenantId.length > 0,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTenant,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tenants.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all }),
      ]);
      await generateChargesAfterTenantChange(queryClient);
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tenantId,
      input,
    }: {
      tenantId: string;
      input: Partial<Parameters<typeof updateTenant>[1]>;
    }) => updateTenant(tenantId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tenants.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all }),
      ]);
      await generateChargesAfterTenantChange(queryClient);
    },
  });
}

export function useMoveOutTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantId, moveOutDate }: { tenantId: string; moveOutDate: string }) =>
      moveOutTenant(tenantId, moveOutDate),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tenants.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all }),
      ]);
      await generateChargesAfterTenantChange(queryClient);
    },
  });
}

export function useRegenerateTenantToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tenantId: string) => regenerateTenantToken(tenantId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tenants.all });
    },
  });
}

export function usePublicTenantPage(token: string) {
  return useQuery({
    queryKey: queryKeys.tenants.publicPage(token),
    queryFn: () => getPublicTenantPage(token),
    enabled: token.length > 0,
  });
}

export function usePublicTenantReceipts(token: string) {
  return useQuery({
    queryKey: queryKeys.tenants.publicReceipts(token),
    queryFn: () => getPublicTenantReceipts(token),
    enabled: token.length > 0,
  });
}
