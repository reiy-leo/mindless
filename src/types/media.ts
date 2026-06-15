export type MediaType = 'movie' | 'season';
export type MediaStatus = 'normal' | 'favorite' | 'watched' | 'archived';
export type RelationType = 'series' | 'sequel' | 'prequel' | 'spin-off';

export interface MediaGroup {
  id: string;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaItem {
  id: string;
  type: MediaType;
  title: string;
  year: number | null;
  cover: string | null;
  rating: number | null;
  status: MediaStatus;
  groupId: string | null;
  doubanUrl: string | null;
  imdbUrl: string | null;
  rottenTomatoesUrl: string | null;
  tvShowTitle: string | null;
  seasonNumber: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaOtherName {
  id: string;
  mediaItemId: string;
  name: string;
  label: string;
  sortOrder: number;
}

export interface MediaWatchLink {
  id: string;
  mediaItemId: string;
  url: string;
  platform: string | null;
  sortOrder: number;
}

export interface MediaRelation {
  id: string;
  mediaItemId: string;
  relatedItemId: string;
  relationType: RelationType | null;
}

export interface MediaItemWithDetails extends MediaItem {
  otherNames: MediaOtherName[];
  watchLinks: MediaWatchLink[];
  relations: MediaRelation[];
}

export interface CreateMediaItemInput {
  type: MediaType;
  title: string;
  year?: number;
  cover?: string;
  rating?: number;
  status?: MediaStatus;
  groupId?: string;
  doubanUrl?: string;
  imdbUrl?: string;
  rottenTomatoesUrl?: string;
  tvShowTitle?: string;
  seasonNumber?: number;
  otherNames?: { name: string; label?: string }[];
  watchLinks?: { url: string; platform?: string }[];
  relatedItemIds?: string[];
}

export interface UpdateMediaItemInput {
  title?: string;
  year?: number;
  cover?: string;
  rating?: number;
  status?: MediaStatus;
  groupId?: string;
  doubanUrl?: string;
  imdbUrl?: string;
  rottenTomatoesUrl?: string;
  tvShowTitle?: string;
  seasonNumber?: number;
  otherNames?: { name: string; label?: string }[];
  watchLinks?: { url: string; platform?: string }[];
  relatedItemIds?: string[];
}
