import type { ProviderType, SyncProvider } from './types'
import { GitHubProvider } from './github'
import { GitLabProvider } from './gitlab'
import { GiteeProvider } from './gitee'

export type { ProviderType, SyncProvider }

export function getProvider(type: ProviderType, pat: string, url?: string): SyncProvider {
  switch (type) {
    case 'github':
      return new GitHubProvider(pat)
    case 'gitlab': {
      let host = 'https://gitlab.com'
      if (url) {
        try {
          const u = new URL(url)
          host = `${u.protocol}//${u.host}`
        } catch {}
      }
      return new GitLabProvider(pat, host)
    }
    case 'gitee':
      return new GiteeProvider(pat)
  }
}

export function detectProvider(url: string): ProviderType | null {
  if (url.includes('github.com')) return 'github'
  if (url.includes('gitlab.com') || url.includes('gitlab.')) return 'gitlab'
  if (url.includes('gitee.com')) return 'gitee'
  return null
}

export function parseRepoUrl(url: string): { provider: ProviderType; owner: string; repo: string; host: string } | null {
  const match = url.trim().match(/^https?:\/\/([^/]+)\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/)?$/)
  if (!match) return null
  const provider = detectProvider(url)
  if (!provider) return null
  return { provider, owner: match[2], repo: match[3], host: `https://${match[1]}` }
}

export async function testConnection(
  pat: string,
  repoUrl: string,
): Promise<{ success: boolean; error?: string }> {
  const info = parseRepoUrl(repoUrl)
  if (!info) return { success: false, error: 'invalid_url' }

  const provider = getProvider(info.provider, pat, repoUrl)
  return provider.testConnection(info.owner, info.repo)
}

export async function syncToRepo(
  pat: string,
  repoUrl: string,
  exportJson: string,
  dbBase64: string,
): Promise<{ success: boolean; error?: string }> {
  const info = parseRepoUrl(repoUrl)
  if (!info) return { success: false, error: 'invalid_url' }

  try {
    const provider = getProvider(info.provider, pat, repoUrl)
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    const msg = `Mindless: sync data ${now}`

    await provider.uploadFile(info.owner, info.repo, 'mindless-data/mindless.json', exportJson, msg)
    await provider.uploadBinaryFile(info.owner, info.repo, 'mindless-data/mindless.db', dbBase64, msg)

    return { success: true }
  } catch (err: any) {
    console.error('Sync failed:', err)
    return { success: false, error: err.message || 'unknown_error' }
  }
}
