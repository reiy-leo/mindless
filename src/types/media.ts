export type MediaType = 'movie' | 'season';
export type MediaStatus = 'unwatched' | 'planned' | 'normal' | 'watched' | 'archived';
export type RelationType = 'series' | 'sequel' | 'prequel' | 'spin-off';

export interface MediaGroup {
  id: string;
  name: string;
  color: string;
  icon: string;
  isPreset: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaGroupWithCount extends MediaGroup {
  usageCount: number;
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
  linkedTaskIds: string[];
  linkedNoteIds: string[];
}

export interface MediaWatchHistory {
  id: string;
  mediaItemId: string;
  startDate: string | null;
  endDate: string | null;
  note: string | null;
  createdAt: string;
}

export interface MediaWatchHistoryLinkDetail {
  id: string;
  linkedType: 'task' | 'note';
  linkedId: string;
  title: string;
}

export interface MediaWatchHistoryWithLinks extends MediaWatchHistory {
  links: MediaWatchHistoryLinkDetail[];
}

export interface CreateMediaWatchHistoryInput {
  mediaItemId: string;
  startDate?: string;
  endDate?: string;
  note?: string;
  linkedItems?: { linkedType: 'task' | 'note'; linkedId: string }[];
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
  linkedTaskIds?: string[];
  linkedNoteIds?: string[];
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
  linkedTaskIds?: string[];
  linkedNoteIds?: string[];
}
