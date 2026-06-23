export interface Attachment {
  id: string;
  taskId: string;
  originalFilename: string;
  filename: string;
  addedDatetime: string;
  sha256: string;
  localPath: string | null;
}

export interface PendingAttachment {
  originalFilename: string;
  fileBytes: number[];
  size: number;
}
