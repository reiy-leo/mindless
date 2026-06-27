import { Gitlab } from '@gitbeaker/rest'
import type { SyncProvider } from './types'

export class GitLabProvider implements SyncProvider {
  private api: InstanceType<typeof Gitlab>
  private projectId: string

  constructor(pat: string, projectId: string, host = 'https://gitlab.com') {
    this.api = new Gitlab({
      host,
      token: pat,
    })
    this.projectId = projectId
  }

  private async detectBranch(): Promise<string> {
    try {
      const project = await this.api.Projects.show(this.projectId)
      return (project.default_branch as string) || 'main'
    } catch {
      return 'main'
    }
  }

  async getFileSha(_owner: string, _repo: string, path: string): Promise<string | undefined> {
    try {
      const branch = await this.detectBranch()
      const file = await this.api.RepositoryFiles.show(this.projectId, path, branch)
      return (file as any).content_sha256 || (file as any).blob_id || undefined
    } catch {
      return undefined
    }
  }

  async uploadFile(_owner: string, _repo: string, path: string, content: string, message: string): Promise<void> {
    const branch = await this.detectBranch()
    const sha = await this.getFileSha(_owner, _repo, path)

    if (sha) {
      await this.api.RepositoryFiles.edit(this.projectId, path, branch, content, message)
    } else {
      await this.api.RepositoryFiles.create(this.projectId, path, branch, content, message)
    }
  }

  async uploadBinaryFile(
    _owner: string,
    _repo: string,
    path: string,
    base64Content: string,
    message: string,
  ): Promise<void> {
    const branch = await this.detectBranch()
    const sha = await this.getFileSha(_owner, _repo, path)

    if (sha) {
      await this.api.RepositoryFiles.edit(this.projectId, path, branch, base64Content, message, { encoding: 'base64' })
    } else {
      await this.api.RepositoryFiles.create(this.projectId, path, branch, base64Content, message, { encoding: 'base64' })
    }
  }

  async deleteFile(_owner: string, _repo: string, path: string, _sha: string, message: string): Promise<void> {
    const branch = await this.detectBranch()
    await this.api.RepositoryFiles.remove(this.projectId, path, branch, message)
  }

  async getFileContent(_owner: string, _repo: string, path: string): Promise<string | null> {
    try {
      const branch = await this.detectBranch()
      const file = await this.api.RepositoryFiles.show(this.projectId, path, branch)
      return decodeURIComponent(escape(atob(file.content)))
    } catch {
      return null
    }
  }

  async testConnection(_owner: string, _repo: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.api.Projects.show(this.projectId)

      const testFile = 'mindless-test.txt'
      const testContent = 'This is a attempt to upload mindless data'
      const testPath = `${testFile}`

      const existingSha = await this.getFileSha(_owner, _repo, testPath)
      if (existingSha) {
        await this.deleteFile(_owner, _repo, testPath, existingSha, 'Mindless: clean up existing test file')
      }

      await this.uploadFile(_owner, _repo, testPath, testContent, 'Mindless: test write permission')

      const readBack = await this.getFileContent(_owner, _repo, testPath)
      if (readBack?.trim() !== testContent.trim()) {
        console.warn('content_mismatch', readBack?.trim(), testContent.trim())
        return { error: 'content_mismatch', success: false }
      }

      await this.deleteFile(_owner, _repo, testPath, '', 'Mindless: clean up test file')

      return { success: true }
    } catch (err: any) {
      console.error('GitLab connection test failed:', err)
      return { error: err.message || 'unknown_error', success: false }
    }
  }
}
