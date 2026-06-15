import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { CreateMediaItemInput, UpdateMediaItemInput } from '@/types/media';

// Media Group hooks
export function useMediaGroups() {
  return useQuery({
    queryKey: ['mediaGroups'],
    queryFn: api.getMediaGroups,
  });
}

export function useCreateMediaGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { name: string; color?: string; icon?: string }) =>
      api.createMediaGroup(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaGroups'] });
    },
  });
}

export function useUpdateMediaGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...params }: { id: string; name?: string; color?: string; icon?: string }) =>
      api.updateMediaGroup(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaGroups'] });
    },
  });
}

export function useDeleteMediaGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteMediaGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaGroups'] });
      queryClient.invalidateQueries({ queryKey: ['mediaItems'] });
    },
  });
}

// Media Item hooks
export function useMediaItems(filters?: { status?: string; groupId?: string; search?: string }) {
  return useQuery({
    queryKey: ['mediaItems', filters],
    queryFn: () => api.getMediaItems(filters),
  });
}

export function useMediaItemDetails(id: string | null) {
  return useQuery({
    queryKey: ['mediaItemDetails', id],
    queryFn: () => api.getMediaItemDetails(id!),
    enabled: !!id,
  });
}

export function useCreateMediaItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: CreateMediaItemInput) => api.createMediaItem(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaItems'] });
    },
  });
}

export function useUpdateMediaItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...params }: { id: string } & UpdateMediaItemInput) =>
      api.updateMediaItem(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaItems'] });
      queryClient.invalidateQueries({ queryKey: ['mediaItemDetails'] });
    },
  });
}

export function useDeleteMediaItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteMediaItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaItems'] });
    },
  });
}
