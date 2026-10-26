import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";

import {
  createRoom,
  getProperty,
  getRoom,
  listActiveRooms,
  listInactiveRooms,
  setRoomActive,
  updatePropertyBankDetails,
  updateRoom,
} from "./api";

export function useActiveRooms() {
  return useQuery({ queryKey: queryKeys.rooms.active, queryFn: listActiveRooms });
}

export function useInactiveRooms() {
  return useQuery({ queryKey: queryKeys.rooms.inactive, queryFn: listInactiveRooms });
}

export function useRoom(roomId: string) {
  return useQuery({
    queryKey: queryKeys.rooms.room(roomId),
    queryFn: () => getRoom(roomId),
    enabled: roomId.length > 0,
  });
}

export function useProperty() {
  return useQuery({ queryKey: queryKeys.rooms.property, queryFn: getProperty });
}

export function useUpdatePropertyBankDetails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ propertyId, bankDetails }: { propertyId: string; bankDetails: string | null }) =>
      updatePropertyBankDetails(propertyId, bankDetails),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.rooms.property });
    },
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRoom,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all });
    },
  });
}

export function useUpdateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, input }: { roomId: string; input: Parameters<typeof updateRoom>[1] }) =>
      updateRoom(roomId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all });
    },
  });
}

export function useSetRoomActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, isActive }: { roomId: string; isActive: boolean }) =>
      setRoomActive(roomId, isActive),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all });
    },
  });
}
