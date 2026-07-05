export interface Attachment {
  id: string;
  taskId?: string | null;
  ownerType: 'task' | 'item';
  ownerId: string;
  originalFilename: string;
  filename: string;
  addedDatetime: string;
  sha256: string;
  localPath: string | null;
  syncStatus: 'none' | 'syncing' | 'synced' | 'failed';
  syncProvider: string | null;
  syncError: string | null;
  uploadedTo: string | null;
  rawUrl: string | null;
}

export interface PendingAttachment {
  originalFilename: string;
  fileBytes: number[];
  size: number;
}
