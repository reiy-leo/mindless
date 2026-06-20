export interface NoteGroup {
  id: string;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  groupId?: string;
  parentId?: string;
  tagIds?: string;
  isCompleted: boolean;
  isArchived: boolean;
  isPinned: boolean;
  level: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  deletedAt?: string;
  targetDate?: string;
}

export interface NoteLinkedItem {
  id: string;
  noteId: string;
  linkedType: 'task' | 'person' | 'media';
  linkedId: string;
}
