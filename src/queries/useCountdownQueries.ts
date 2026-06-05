import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { CreateCountdownParams, UpdateCountdownParams } from '@/types/countdown';

// Queries
export function useCountdowns() {
  return useQuery({
    queryKey: ['countdowns'],
    queryFn: () => api.getCountdowns(),
  });
}

export function useCountdown(id: string) {
  return useQuery({
    queryKey: ['countdown', id],
    queryFn: () => api.getCountdownById(id),
    enabled: !!id,
  });
}

// Mutations
export function useCreateCountdown() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateCountdownParams) => api.createCountdown(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countdowns'] });
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
    },
  });
}

export function useDeleteCountdown() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteCountdown(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countdowns'] });
    },
  });
}
