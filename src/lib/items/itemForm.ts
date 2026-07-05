import type { ItemLink, ItemPurchaseLine, ItemSource } from '@/types/item'

export interface ItemFormState {
  groupId?: string
  links: Array<{
    label: string
    url: string
  }>
  name: string
  notes: string
  purchaseDate: string
  purchaseLines: Array<{
    name: string
    note: string
    quantity: string
    unitPrice: string
  }>
  purchasePrice: string
  selectedTagIds: string[]
  source: ItemSource | ''
}

export interface NormalizedItemFormPayload {
  groupId?: string
  name: string
  notes?: string
  links: Array<Omit<ItemLink, 'createdAt' | 'id' | 'itemId' | 'updatedAt'>>
  purchaseDate?: string
  purchaseLines: Array<Omit<ItemPurchaseLine, 'createdAt' | 'id' | 'itemId' | 'updatedAt'>>
  purchasePrice?: number
  source?: ItemSource
  tagIds?: string
}

export function normalizeItemFormPayload(state: ItemFormState): NormalizedItemFormPayload {
  const links = state.links
    .map((link, index) => ({
      label: link.label.trim() || null,
      sortOrder: index,
      url: link.url.trim(),
    }))
    .filter((link) => link.url)

  const purchaseLines = state.purchaseLines
    .map((line, index) => ({
      name: line.name.trim(),
      note: line.note.trim() || null,
      quantity: Number(line.quantity) || 1,
      sortOrder: index,
      unitPrice: line.unitPrice.trim() ? Number(line.unitPrice) : null,
    }))
    .filter((line) => line.name)

  return {
    groupId: state.groupId || undefined,
    links,
    name: state.name.trim(),
    notes: state.notes.trim() || undefined,
    purchaseDate: state.purchaseDate || undefined,
    purchaseLines,
    purchasePrice: state.purchasePrice.trim() ? Number(state.purchasePrice) : undefined,
    source: state.source || undefined,
    tagIds: state.selectedTagIds.length > 0 ? state.selectedTagIds.join(',') : undefined,
  }
}
