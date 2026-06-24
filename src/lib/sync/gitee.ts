import type { SyncProvider } from './types'

const BASE_URL = 'https://gitee.com/api/v5'

interface GiteeFileResponse {
  content: string
  encoding: string
  name: string
  path: string
  sha: string
  size: number
}

export class GiteeProvider implements SyncProvider {
  private token: string

  constructor(pat: string) {
    this.token = pat
  }

  private async request(method: string, path: string, body?: Record<string, unknown>): Promise<Response> {
    const url = new URL(`${BASE_URL}${path}`)
    url.searchParams.set('access_token', this.token)

    const options: RequestInit = {
      headers: { 'Content-Type': 'application/json' },
      method,
    }
    if (body) {
      options.body = JSON.stringify(body)
    }

    const res = await fetch(url.toString(), options)
    if (!res.ok) {
      const errorBody = await res.text()
      throw new Error(`Gitee API error ${res.status}: ${errorBody}`)
    }
    return res
  }

  async getFileSha(owner: string, repo: string, path: string): Promise<string | undefined> {
    try {
      const res = await this.request('GET', `/repos/${owner}/${repo}/contents/${path}`)
      const data = (await res.json()) as GiteeFileResponse
      return data.sha
    } catch {
      return undefined
    }
  }

  async uploadFile(owner: string, repo: string, path: string, content: string, message: string): Promise<void> {
    const base64Content = btoa(unescape(encodeURIComponent(content)))

    try {
      const sha = await this.getFileSha(owner, repo, path)
      if (sha) {
        await this.request('PUT', `/repos/${owner}/${repo}/contents/${path}`, {
          branch: 'main',
          content: base64Content,
          message,
          sha,
        })
      } else {
        await this.request('POST', `/repos/${owner}/${repo}/contents/${path}`, {
          branch: 'main',
          content: base64Content,
          message,
        })
      }
    } catch (err: any) {
      if (err.message?.includes('文件名已存在') || err.message?.includes('already exists')) {
        const sha = await this.getFileSha(owner, repo, path)
        if (sha) {
          await this.deleteFile(owner, repo, path, sha, 'Mindless: delete before re-upload')
          await this.request('POST', `/repos/${owner}/${repo}/contents/${path}`, {
            branch: 'main',
            content: base64Content,
            message,
          })
          return
        }
      }
      throw err
    }
  }

  async uploadBinaryFile(
    owner: string,
    repo: string,
    path: string,
    base64Content: string,
    message: string,
  ): Promise<void> {
    try {
      const sha = await this.getFileSha(owner, repo, path)
      if (sha) {
        await this.request('PUT', `/repos/${owner}/${repo}/contents/${path}`, {
          branch: 'main',
          content: base64Content,
          message,
          sha,
        })
      } else {
        await this.request('POST', `/repos/${owner}/${repo}/contents/${path}`, {
          branch: 'main',
          content: base64Content,
          message,
        })
      }
    } catch (err: any) {
      if (err.message?.includes('文件名已存在') || err.message?.includes('already exists')) {
        const sha = await this.getFileSha(owner, repo, path)
        if (sha) {
          await this.deleteFile(owner, repo, path, sha, 'Mindless: delete before re-upload')
          await this.request('POST', `/repos/${owner}/${repo}/contents/${path}`, {
            branch: 'main',
            content: base64Content,
            message,
          })
          return
        }
      }
      throw err
    }
  }

  async deleteFile(owner: string, repo: string, path: string, sha: string, message: string): Promise<void> {
    await this.request('DELETE', `/repos/${owner}/${repo}/contents/${path}`, {
      branch: 'main',
      message,
      sha,
    })
  }

  async getFileContent(owner: string, repo: string, path: string): Promise<string | null> {
    try {
      const res = await this.request('GET', `/repos/${owner}/${repo}/contents/${path}`)
      const data = (await res.json()) as GiteeFileResponse
      if (!data.content || data.encoding !== 'base64') return null
      return decodeURIComponent(escape(atob(data.content)))
    } catch {
      return null
    }
  }

  async testConnection(owner: string, repo: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.request('GET', `/repos/${owner}/${repo}`)

      const testFile = 'mindless-test.txt'
      const testContent = 'This is a attempt to upload mindless data'
      const testPath = `${testFile}`

      const existingSha = await this.getFileSha(owner, repo, testPath)
      if (existingSha) {
        await this.deleteFile(owner, repo, testPath, existingSha, 'Mindless: clean up existing test file')
      }

      await this.uploadFile(owner, repo, testPath, testContent, 'Mindless: test write permission')

      const sha = await this.getFileSha(owner, repo, testPath)
      if (!sha) {
        return { error: 'Failed to get file sha after upload', success: false }
      }

      await this.deleteFile(owner, repo, testPath, sha, 'Mindless: clean up test file')

      return { success: true }
    } catch (err: any) {
      console.error('Gitee connection test failed:', err)
      return { error: err.message || 'unknown_error', success: false }
    }
  }
}
