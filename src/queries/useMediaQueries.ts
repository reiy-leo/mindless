import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { CreateMediaItemInput, UpdateMediaItemInput, CreateMediaWatchHistoryInput } from '@/types/media';

// Media Group hooks
export function useMediaGroups() {
  return useQuery({
    queryKey: ['mediaGroups'],
    queryFn: api.getMediaGroups,
  });
}

export function useMediaGroupsWithCount() {
  return useQuery({
    queryKey: ['mediaGroupsWithCount'],
    queryFn: api.getMediaGroupsWithCount,
  });
}

export function useCreateMediaGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { name: string; color?: string; icon?: string }) =>
      api.createMediaGroup(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaGroups'] });
      queryClient.invalidateQueries({ queryKey: ['mediaGroupsWithCount'] });
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
      queryClient.invalidateQueries({ queryKey: ['mediaGroupsWithCount'] });
    },
  });
}

export function useDeleteMediaGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteMediaGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaGroups'] });
      queryClient.invalidateQueries({ queryKey: ['mediaGroupsWithCount'] });
      queryClient.invalidateQueries({ queryKey: ['mediaItems'] });
    },
  });
}

// Media Item Genre hooks
export function useMediaItemGenres(mediaItemId: string | null) {
  return useQuery({
    queryKey: ['mediaItemGenres', mediaItemId],
    queryFn: () => api.getMediaItemGenres(mediaItemId!),
    enabled: !!mediaItemId,
  });
}

export function useUpdateMediaItemGenres() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ mediaItemId, genreIds }: { mediaItemId: string; genreIds: string[] }) =>
      api.updateMediaItemGenres(mediaItemId, genreIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaItemGenres'] });
      queryClient.invalidateQueries({ queryKey: ['mediaGroupsWithCount'] });
      queryClient.invalidateQueries({ queryKey: ['mediaItemDetails'] });
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

// Media Watch History hooks
export function useMediaWatchHistory(mediaItemId: string | null) {
  return useQuery({
    queryKey: ['mediaWatchHistory', mediaItemId],
    queryFn: () => api.getMediaWatchHistory(mediaItemId!),
    enabled: !!mediaItemId,
  });
}

export function useCreateMediaWatchHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: CreateMediaWatchHistoryInput) => api.createMediaWatchHistory(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mediaWatchHistory', variables.mediaItemId] });
    },
  });
}

export function useUpdateMediaWatchHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...params }: { id: string; mediaItemId: string } & Partial<CreateMediaWatchHistoryInput>) =>
      api.updateMediaWatchHistory(id, params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mediaWatchHistory', variables.mediaItemId] });
    },
  });
}

export function useDeleteMediaWatchHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; mediaItemId: string }) =>
      api.deleteMediaWatchHistory(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mediaWatchHistory', variables.mediaItemId] });
    },
  });
}
