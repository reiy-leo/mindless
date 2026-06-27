export interface TaskTemplate {
  id: string;
  name: string;
  title?: string;
  description?: string;
  steps?: string;
  tagIds?: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}
