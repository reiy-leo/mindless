import { useQuery, useMutation } from '@tanstack/react-query';
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
  return useMutation({
    mutationFn: (params: { name: string; color?: string; icon?: string }) =>
      api.createPersonGroup(params),
  });
}

export function useUpdatePersonGroup() {
  return useMutation({
    mutationFn: ({ id, ...params }: { id: string; name?: string; color?: string; icon?: string; isPinned?: boolean; isArchived?: boolean }) =>
      api.updatePersonGroup(id, params),
  });
}

export function useDeletePersonGroup() {
  return useMutation({
    mutationFn: (id: string) => api.deletePersonGroup(id),
  });
}

// ==================== Person mutations ====================

export function useCreatePerson() {
  return useMutation({
    mutationFn: (params: { name: string; englishName?: string; nickname?: string; remark?: string; groupId?: string; tagIds?: string; avatar?: string; birthday?: string; lunarBirthday?: string; foodTaboos?: string; preferences?: string }) => {
      console.log('[usePersonQueries] createPerson mutationFn with:', params);
      return api.createPerson(params);
    },
  });
}

export function useUpdatePerson() {
  return useMutation({
    mutationFn: ({ id, ...params }: { id: string; name?: string; englishName?: string; nickname?: string; remark?: string; groupId?: string; tagIds?: string; isPinned?: boolean; isArchived?: boolean; sortOrder?: number; avatar?: string; birthday?: string; lunarBirthday?: string; foodTaboos?: string; preferences?: string }) =>
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

export function useCreatePersonPhones() {
  return useMutation({
    mutationFn: (params: { personId: string; phones: { phone: string; label: string }[] }) =>
      api.createPersonPhones(params.personId, params.phones),
  });
}

export function useCreatePersonEmails() {
  return useMutation({
    mutationFn: (params: { personId: string; emails: { email: string; label: string }[] }) =>
      api.createPersonEmails(params.personId, params.emails),
  });
}
