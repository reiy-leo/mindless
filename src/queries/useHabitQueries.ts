import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { Habit, CreateHabitParams } from '@/types/habit';

// Queries
export function useHabits() {
  return useQuery({
    queryKey: ['habits'],
    queryFn: () => api.getHabits(),
  });
}

export function useHabit(id: string) {
  return useQuery({
    queryKey: ['habit', id],
    queryFn: () => api.getHabitById(id),
    enabled: !!id,
  });
}

export function useHabitLogs(habitId: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['habit-logs', habitId, startDate, endDate],
    queryFn: () => api.getHabitLogs(habitId, startDate, endDate),
    enabled: !!habitId,
  });
}

// Mutations
export function useCreateHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateHabitParams) => api.createHabit(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });
}

export function useUpdateHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...params }: Partial<Habit> & { id: string }) =>
      api.updateHabit(id, params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habit', variables.id] });
    },
  });
}

export function useDeleteHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteHabit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });
}

export function useCheckInHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ habitId, date }: { habitId: string; date: string }) =>
      api.checkInHabit(habitId, date),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habit', variables.habitId] });
      queryClient.invalidateQueries({ queryKey: ['habit-logs', variables.habitId] });
      queryClient.invalidateQueries({ queryKey: ['today-checkins'] });
    },
  });
}

export function useTodayCheckins() {
  return useQuery({
    queryKey: ['today-checkins'],
    queryFn: () => api.getTodayCheckins(),
  });
}
