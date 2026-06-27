export type ProviderType = 'github' | 'gitlab' | 'gitee'

export interface SyncProvider {
  deleteFile(owner: string, repo: string, path: string, sha: string, message: string): Promise<void>
  getFileContent(owner: string, repo: string, path: string): Promise<string | null>
  getFileSha(owner: string, repo: string, path: string): Promise<string | undefined>
  testConnection(owner: string, repo: string): Promise<{ success: boolean; error?: string }>
  uploadBinaryFile(owner: string, repo: string, path: string, base64: string, message: string): Promise<void>
  uploadFile(owner: string, repo: string, path: string, content: string, message: string): Promise<void>
}
