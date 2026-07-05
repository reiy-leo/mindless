import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api'
import type { CreateItemInput, UpdateItemInput } from '@/types/item'

export function useItemGroups(includeHidden = false) {
  return useQuery({
    queryFn: () => api.getItemGroups(includeHidden),
    queryKey: ['itemGroups', includeHidden],
  })
}

export function useCreateItemGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { color?: string; icon?: string; name: string }) => api.createItemGroup(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itemGroups'] })
    },
  })
}

export function useUpdateItemGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...params }: { color?: string; icon?: string; id: string; isHidden?: boolean; name?: string }) =>
      api.updateItemGroup(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itemGroups'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
    },
  })
}

export function useDeleteItemGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteItemGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itemGroups'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
    },
  })
}

export function useItems(filters?: { groupId?: string; search?: string }) {
  return useQuery({
    queryFn: () => api.getItems(filters),
    queryKey: ['items', filters],
  })
}

export function useCreateItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: CreateItemInput) => api.createItem(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['itemGroups'] })
    },
  })
}

export function useUpdateItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...params }: { id: string } & UpdateItemInput) => api.updateItem(id, params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['item', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['itemPurchaseLines', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['itemGroups'] })
    },
  })
}

export function useDeleteItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['itemGroups'] })
    },
  })
}

export function useItemPurchaseLines(itemId?: string | null) {
  return useQuery({
    enabled: !!itemId,
    queryFn: () => api.getItemPurchaseLines(itemId!),
    queryKey: ['itemPurchaseLines', itemId],
  })
}

export function useItemLinkedItems(itemId?: string | null) {
  return useQuery({
    enabled: !!itemId,
    queryFn: () => api.getItemLinkedItems(itemId!),
    queryKey: ['itemLinkedItems', itemId],
  })
}

export function useLinkItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, linkedType, linkedId }: { itemId: string; linkedId: string; linkedType: string }) =>
      api.linkItem(itemId, linkedType, linkedId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['itemLinkedItems', variables.itemId] })
    },
  })
}

export function useUnlinkItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; itemId: string }) => api.unlinkItem(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['itemLinkedItems', variables.itemId] })
    },
  })
}

export function useOwnerAttachments(ownerType: 'task' | 'item', ownerId?: string | null) {
  return useQuery({
    enabled: !!ownerId,
    queryFn: () => api.getAttachmentsByOwner(ownerType, ownerId!),
    queryKey: ['attachments', ownerType, ownerId],
  })
}
