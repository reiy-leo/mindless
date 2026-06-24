export type ProviderType = 'github' | 'gitlab' | 'gitee'

export interface SyncProvider {
  testConnection(owner: string, repo: string): Promise<{ success: boolean; error?: string }>
  uploadFile(owner: string, repo: string, path: string, content: string, message: string): Promise<void>
  uploadBinaryFile(owner: string, repo: string, path: string, base64: string, message: string): Promise<void>
  deleteFile(owner: string, repo: string, path: string, sha: string, message: string): Promise<void>
  getFileContent(owner: string, repo: string, path: string): Promise<string | null>
  getFileSha(owner: string, repo: string, path: string): Promise<string | undefined>
}
