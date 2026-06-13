import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';

// Query hooks
export function useNoteGroups() {
  return useQuery({
    queryKey: ['noteGroups'],
    queryFn: api.getNoteGroups,
  });
}

export function useNotes() {
  return useQuery({
    queryKey: ['notes'],
    queryFn: api.getNotes,
  });
}

export function useAllNotes() {
  return useQuery({
    queryKey: ['allNotes'],
    queryFn: api.getAllNotes,
  });
}

export function useSubNotes(parentId: string | undefined) {
  return useQuery({
    queryKey: ['subNotes', parentId],
    queryFn: () => api.getSubNotes(parentId!),
    enabled: !!parentId,
  });
}

export function useAllSubNotes(noteIds: string[]) {
  return useQuery({
    queryKey: ['allSubNotes', noteIds.join(',')],
    queryFn: () => api.getAllSubNotes(noteIds),
    enabled: noteIds.length > 0,
  });
}

// Note Group mutations
export function useCreateNoteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { name: string; color?: string; icon?: string }) =>
      api.createNoteGroup(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['noteGroups'] });
    },
  });
}

export function useUpdateNoteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...params }: { id: string; name?: string; color?: string; icon?: string; isArchived?: boolean }) =>
      api.updateNoteGroup(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['noteGroups'] });
    },
  });
}

export function useDeleteNoteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteNoteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['noteGroups'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['allNotes'] });
    },
  });
}

// Note mutations
export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { title: string; content?: string; groupId?: string; parentId?: string; tagIds?: string; level?: number }) =>
      api.createNote(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['allNotes'] });
      queryClient.invalidateQueries({ queryKey: ['subNotes'] });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...params }: { id: string; title?: string; content?: string; groupId?: string; tagIds?: string; isCompleted?: boolean; isArchived?: boolean; isPinned?: boolean; sortOrder?: number }) =>
      api.updateNote(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['allNotes'] });
      queryClient.invalidateQueries({ queryKey: ['subNotes'] });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['allNotes'] });
      queryClient.invalidateQueries({ queryKey: ['subNotes'] });
    },
  });
}

export function useArchiveNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.archiveNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['allNotes'] });
    },
  });
}

export function useUnarchiveNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.unarchiveNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['allNotes'] });
    },
  });
}

export function useCompleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.completeNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['allNotes'] });
    },
  });
}
