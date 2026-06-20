import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { CreateCountdownParams, UpdateCountdownParams } from '@/types/countdown';

// Queries
export function useCountdowns(groupId?: string, smartGroup?: string) {
  return useQuery({
    queryKey: ['countdowns', groupId, smartGroup],
    queryFn: () => api.getCountdowns(groupId, smartGroup),
  });
}

export function useCountdown(id: string) {
  return useQuery({
    queryKey: ['countdown', id],
    queryFn: () => api.getCountdownById(id),
    enabled: !!id,
  });
}

export function useCountdownGroups() {
  return useQuery({
    queryKey: ['countdown-groups'],
    queryFn: () => api.getCountdownGroups(),
  });
}

// Mutations
export function useCreateCountdown() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateCountdownParams) => api.createCountdown(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countdowns'] });
      queryClient.invalidateQueries({ queryKey: ['countdown-groups'] });
    },
  });
}

export function useUpdateCountdown() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...params }: UpdateCountdownParams & { id: string }) =>
      api.updateCountdown(id, params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['countdowns'] });
      queryClient.invalidateQueries({ queryKey: ['countdown', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['countdown-groups'] });
    },
  });
}

export function useDeleteCountdown() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteCountdown(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countdowns'] });
      queryClient.invalidateQueries({ queryKey: ['countdown-groups'] });
    },
  });
}

export function useRestoreCountdown() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.restoreCountdown(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countdowns'] });
      queryClient.invalidateQueries({ queryKey: ['countdown-groups'] });
    },
  });
}

export function useToggleCountdownFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.toggleCountdownFavorite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countdowns'] });
    },
  });
}

export function useToggleCountdownCompleted() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.toggleCountdownCompleted(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countdowns'] });
      queryClient.invalidateQueries({ queryKey: ['countdown-groups'] });
    },
  });
}

// Countdown Group mutations
export function useCreateCountdownGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { name: string; color?: string; icon?: string }) =>
      api.createCountdownGroup(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countdown-groups'] });
    },
  });
}

export function useUpdateCountdownGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...params }: { id: string; name?: string; color?: string; icon?: string }) =>
      api.updateCountdownGroup(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countdown-groups'] });
    },
  });
}

export function useDeleteCountdownGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteCountdownGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countdown-groups'] });
      queryClient.invalidateQueries({ queryKey: ['countdowns'] });
    },
  });
}
