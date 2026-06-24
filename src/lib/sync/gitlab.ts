import { Gitlab } from '@gitbeaker/rest'
import type { SyncProvider } from './types'

export class GitLabProvider implements SyncProvider {
  private api: InstanceType<typeof Gitlab>

  constructor(pat: string, host = 'https://gitlab.com') {
    this.api = new Gitlab({
      host,
      token: pat,
    })
  }

  private getProjectPath(owner: string, repo: string): string {
    return `${owner}/${repo}`
  }

  private async detectBranch(projectPath: string): Promise<string> {
    try {
      const project = await this.api.Projects.show(projectPath)
      return (project.default_branch as string) || 'main'
    } catch {
      return 'main'
    }
  }

  async getFileSha(owner: string, repo: string, path: string): Promise<string | undefined> {
    try {
      const projectPath = this.getProjectPath(owner, repo)
      const branch = await this.detectBranch(projectPath)
      const file = await this.api.RepositoryFiles.show(projectPath, path, branch)
      return (file as any).content_sha256 || (file as any).blob_id || undefined
    } catch {
      return undefined
    }
  }

  async uploadFile(owner: string, repo: string, path: string, content: string, message: string): Promise<void> {
    const projectPath = this.getProjectPath(owner, repo)
    const branch = await this.detectBranch(projectPath)
    const sha = await this.getFileSha(owner, repo, path)

    if (sha) {
      await this.api.RepositoryFiles.edit(projectPath, path, branch, content, message)
    } else {
      await this.api.RepositoryFiles.create(projectPath, path, branch, content, message)
    }
  }

  async uploadBinaryFile(
    owner: string,
    repo: string,
    path: string,
    base64Content: string,
    message: string,
  ): Promise<void> {
    const projectPath = this.getProjectPath(owner, repo)
    const branch = await this.detectBranch(projectPath)
    const sha = await this.getFileSha(owner, repo, path)
    const content = atob(base64Content)

    if (sha) {
      await this.api.RepositoryFiles.edit(projectPath, path, branch, content, message)
    } else {
      await this.api.RepositoryFiles.create(projectPath, path, branch, content, message)
    }
  }

  async deleteFile(owner: string, repo: string, path: string, _sha: string, message: string): Promise<void> {
    const projectPath = this.getProjectPath(owner, repo)
    const branch = await this.detectBranch(projectPath)
    await this.api.RepositoryFiles.remove(projectPath, path, branch, message)
  }

  async getFileContent(owner: string, repo: string, path: string): Promise<string | null> {
    try {
      const projectPath = this.getProjectPath(owner, repo)
      const branch = await this.detectBranch(projectPath)
      const file = await this.api.RepositoryFiles.show(projectPath, path, branch)
      return decodeURIComponent(escape(atob(file.content)))
    } catch {
      return null
    }
  }

  async testConnection(owner: string, repo: string): Promise<{ success: boolean; error?: string }> {
    try {
      const projectPath = this.getProjectPath(owner, repo)
      await this.api.Projects.show(projectPath)

      const testFile = 'mindless-test.txt'
      const testContent = 'This is a attempt to upload mindless data'
      // warning: 此处testPath不要修改
      const testPath = `${testFile}`

      const existingSha = await this.getFileSha(owner, repo, testPath)
      if (existingSha) {
        await this.deleteFile(owner, repo, testPath, existingSha, 'Mindless: clean up existing test file')
      }

      await this.uploadFile(owner, repo, testPath, testContent, 'Mindless: test write permission')

      const readBack = await this.getFileContent(owner, repo, testPath)
      if (readBack?.trim() !== testContent.trim()) {
        console.warn('content_mismatch', readBack?.trim(), testContent.trim())
        return { error: 'content_mismatch', success: false }
      }

      await this.deleteFile(owner, repo, testPath, '', 'Mindless: clean up test file')

      return { success: true }
    } catch (err: any) {
      console.error('GitLab connection test failed:', err)
      return { error: err.message || 'unknown_error', success: false }
    }
  }
}
