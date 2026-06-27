import type { ProviderType, SyncProvider } from './types'
import { GitHubProvider } from './github'
import { GitLabProvider } from './gitlab'
import { GiteeProvider } from './gitee'

export type { ProviderType, SyncProvider }

export function getProvider(type: ProviderType, pat: string, url?: string, projectId?: string): SyncProvider {
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
      return new GitLabProvider(pat, projectId || '', host)
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
  projectId?: string,
): Promise<{ success: boolean; error?: string }> {
  const info = parseRepoUrl(repoUrl)
  if (!info) return { success: false, error: 'invalid_url' }

  const provider = getProvider(info.provider, pat, repoUrl, projectId)
  return provider.testConnection(info.owner, info.repo)
}

export async function syncToRepo(
  pat: string,
  repoUrl: string,
  exportJson: string,
  dbBase64: string,
  projectId?: string,
): Promise<{ success: boolean; error?: string }> {
  const info = parseRepoUrl(repoUrl)
  if (!info) return { success: false, error: 'invalid_url' }

  try {
    const provider = getProvider(info.provider, pat, repoUrl, projectId)
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

export async function getActiveProvider(): Promise<{ provider: SyncProvider; info: { provider: ProviderType; owner: string; repo: string; host: string } } | null> {
  const syncProvider = localStorage.getItem('mindless-sync-provider') as ProviderType | null
  if (!syncProvider) return null

  const syncUrl = localStorage.getItem(`mindless-sync-url-${syncProvider}`)
  if (!syncUrl) return null

  const info = parseRepoUrl(syncUrl)
  if (!info) return null

  const { loadPat } = await import('@/lib/api')
  const pat = await loadPat(info.host.replace('https://', ''))
  if (!pat) return null

  const projectId = localStorage.getItem('mindless-sync-gitlab-project-id') || undefined
  const provider = getProvider(syncProvider, pat, syncUrl, projectId)
  return { provider, info }
}
