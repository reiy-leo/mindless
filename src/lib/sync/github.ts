import { Octokit } from '@octokit/rest'
import type { SyncProvider } from './types'

export class GitHubProvider implements SyncProvider {
  private octokit: Octokit

  constructor(pat: string) {
    this.octokit = new Octokit({ auth: pat })
  }

  async getFileSha(owner: string, repo: string, path: string): Promise<string | undefined> {
    try {
      const res = await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner, repo, path,
      })
      if (Array.isArray(res.data)) return undefined
      return res.data.sha
    } catch {
      return undefined
    }
  }

  async uploadFile(owner: string, repo: string, path: string, content: string, message: string): Promise<void> {
    const sha = await this.getFileSha(owner, repo, path)
    await this.octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
      owner, repo, path, message,
      content: btoa(unescape(encodeURIComponent(content))),
      ...(sha ? { sha } : {}),
    })
  }

  async uploadBinaryFile(owner: string, repo: string, path: string, base64Content: string, message: string): Promise<void> {
    const sha = await this.getFileSha(owner, repo, path)
    await this.octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
      owner, repo, path, message,
      content: base64Content,
      ...(sha ? { sha } : {}),
    })
  }

  async deleteFile(owner: string, repo: string, path: string, sha: string, message: string): Promise<void> {
    await this.octokit.request('DELETE /repos/{owner}/{repo}/contents/{path}', {
      owner, repo, path, message, sha,
    })
  }

  async getFileContent(owner: string, repo: string, path: string): Promise<string | null> {
    try {
      const res = await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner, repo, path,
      })
      if (Array.isArray(res.data)) return null
      if (res.data.type !== 'file' || !('content' in res.data)) return null
      return decodeURIComponent(escape(atob(res.data.content)))
    } catch {
      return null
    }
  }

  async testConnection(owner: string, repo: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.octokit.request('GET /repos/{owner}/{repo}', { owner, repo })

      const testFile = 'mindless-test.txt'
      const testContent = 'This is a attempt to upload mindless data'
      const testPath = `mindless-data/${testFile}`

      const existingSha = await this.getFileSha(owner, repo, testPath)
      if (existingSha) {
        await this.deleteFile(owner, repo, testPath, existingSha, 'Mindless: clean up existing test file')
      }

      await this.uploadFile(owner, repo, testPath, testContent, 'Mindless: test write permission')

      const readBack = await this.getFileContent(owner, repo, testPath)
      if (readBack?.trim() !== testContent.trim()) {
        return { success: false, error: 'content_mismatch' }
      }

      const sha = await this.getFileSha(owner, repo, testPath)
      if (sha) {
        await this.deleteFile(owner, repo, testPath, sha, 'Mindless: clean up test file')
      }

      return { success: true }
    } catch (err: any) {
      console.error('GitHub connection test failed:', err)
      return { success: false, error: err.message || 'unknown_error' }
    }
  }
}
