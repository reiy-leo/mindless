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
      queryClient.invalidateQueries({ queryKey: ['archived-habits'] });
    },
  });
}

export function useCheckInHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ habitId, date, value }: { habitId: string; date: string; value?: number }) =>
      api.checkInHabit(habitId, date, value),
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

export function useTodayCheckinMap(): Map<string, number> {
  const { data } = useTodayCheckins();
  const map = new Map<string, number>();
  if (data) {
    for (const info of data) {
      map.set(info.habitId, info.value);
    }
  }
  return map;
}

export function useRefreshStreaks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.refreshHabitStreaks(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });
}

export function useHabitGroups() {
  return useQuery({
    queryKey: ['habit-groups'],
    queryFn: () => api.getHabitGroups(),
  });
}

export function useCreateHabitGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { name: string; icon?: string; color?: string }) =>
      api.createHabitGroup(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit-groups'] });
    },
  });
}

export function useUpdateHabitGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...params }: { id: string; name?: string; icon?: string; color?: string }) =>
      api.updateHabitGroup(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit-groups'] });
    },
  });
}

export function useDeleteHabitGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteHabitGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit-groups'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });
}

export function useArchivedHabits() {
  return useQuery({
    queryKey: ['archived-habits'],
    queryFn: () => api.getArchivedHabits(),
  });
}

export function useUnarchiveHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.unarchiveHabit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['archived-habits'] });
    },
  });
}

export function useHardDeleteHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.hardDeleteHabit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archived-habits'] });
    },
  });
}

export function useMoveHabitToGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ habitId, groupId }: { habitId: string; groupId: string | null }) =>
      api.moveHabitToGroup(habitId, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });
}

export function useDissolveHabitGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.dissolveHabitGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit-groups'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });
}

export function useDeleteHabitGroupWithHabits() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteHabitGroupWithHabits(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit-groups'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });
}
