export type ItemSource = 'amazon' | 'jd' | 'taobao' | 'xiaomi_youpin' | 'xiaoxiang_supermarket' | 'offline_store'

export interface ItemGroup {
  color: string
  createdAt: string
  icon: string
  id: string
  isBuiltin: boolean
  isHidden: boolean
  name: string
  sortOrder: number
  updatedAt: string
  usageCount?: number
}

export interface Item {
  createdAt: string
  deletedAt?: string | null
  groupId?: string | null
  id: string
  links?: ItemLink[]
  name: string
  notes?: string | null
  purchaseDate?: string | null
  purchasePrice?: number | null
  source?: ItemSource | null
  tagIds?: string | null
  updatedAt: string
}

export interface ItemLink {
  createdAt: string
  id: string
  itemId: string
  label: string | null
  sortOrder: number
  updatedAt: string
  url: string
}

export interface ItemPurchaseLine {
  createdAt: string
  id: string
  itemId: string
  name: string
  note: string | null
  quantity: number
  sortOrder: number
  unitPrice: number | null
  updatedAt: string
}

export interface ItemLinkedItem {
  id: string
  itemId: string
  linkedId: string
  linkedType: 'task' | 'note' | 'person' | 'countdown'
}

export interface CreateItemInput {
  groupId?: string
  name: string
  notes?: string
  links?: Array<Omit<ItemLink, 'createdAt' | 'id' | 'itemId' | 'updatedAt'>>
  purchaseDate?: string
  purchaseLines?: Array<Omit<ItemPurchaseLine, 'createdAt' | 'id' | 'itemId' | 'updatedAt'>>
  purchasePrice?: number
  source?: ItemSource
  tagIds?: string
}

export type UpdateItemInput = Partial<CreateItemInput>
