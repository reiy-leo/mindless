import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';

// ==================== Query hooks ====================

export function usePersonGroups() {
  return useQuery({
    queryKey: ['personGroups'],
    queryFn: api.getPersonGroups,
  });
}

export function usePersons() {
  return useQuery({
    queryKey: ['persons'],
    queryFn: api.getPersons,
  });
}

export function useAllPersons() {
  return useQuery({
    queryKey: ['allPersons'],
    queryFn: api.getAllPersons,
  });
}

export function usePersonPhones(personId: string | undefined) {
  return useQuery({
    queryKey: ['personPhones', personId],
    queryFn: () => api.getPersonPhones(personId!),
    enabled: !!personId,
  });
}

export function usePersonEmails(personId: string | undefined) {
  return useQuery({
    queryKey: ['personEmails', personId],
    queryFn: () => api.getPersonEmails(personId!),
    enabled: !!personId,
  });
}

// ==================== Person Group mutations ====================

export function useCreatePersonGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { name: string; color?: string; icon?: string }) =>
      api.createPersonGroup(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personGroups'] });
    },
  });
}

export function useUpdatePersonGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...params }: { id: string; name?: string; color?: string; icon?: string; isPinned?: boolean; isArchived?: boolean }) =>
      api.updatePersonGroup(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personGroups'] });
    },
  });
}

export function useDeletePersonGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePersonGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personGroups'] });
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      queryClient.invalidateQueries({ queryKey: ['allPersons'] });
    },
  });
}

// ==================== Person mutations ====================

export function useCreatePerson() {
  return useMutation({
    mutationFn: (params: { name: string; englishName?: string; nickname?: string; remark?: string; groupId?: string; tagIds?: string }) => {
      console.log('[usePersonQueries] createPerson mutationFn with:', params);
      return api.createPerson(params);
    },
  });
}

export function useUpdatePerson() {
  return useMutation({
    mutationFn: ({ id, ...params }: { id: string; name?: string; englishName?: string; nickname?: string; remark?: string; groupId?: string; tagIds?: string; isPinned?: boolean; isArchived?: boolean; sortOrder?: number }) =>
      api.updatePerson(id, params),
  });
}

export function useDeletePerson() {
  return useMutation({
    mutationFn: (id: string) => api.deletePerson(id),
  });
}

// ==================== Phone mutations ====================

export function useCreatePersonPhone() {
  return useMutation({
    mutationFn: (params: { personId: string; phone: string; label?: string }) =>
      api.createPersonPhone(params),
  });
}

export function useUpdatePersonPhone() {
  return useMutation({
    mutationFn: ({ id, ...params }: { id: string; phone?: string; label?: string }) =>
      api.updatePersonPhone(id, params),
  });
}

export function useDeletePersonPhone() {
  return useMutation({
    mutationFn: (id: string) => api.deletePersonPhone(id),
  });
}

// ==================== Email mutations ====================

export function useCreatePersonEmail() {
  return useMutation({
    mutationFn: (params: { personId: string; email: string; label?: string }) =>
      api.createPersonEmail(params),
  });
}

export function useUpdatePersonEmail() {
  return useMutation({
    mutationFn: ({ id, ...params }: { id: string; email?: string; label?: string }) =>
      api.updatePersonEmail(id, params),
  });
}

export function useDeletePersonEmail() {
  return useMutation({
    mutationFn: (id: string) => api.deletePersonEmail(id),
  });
}
