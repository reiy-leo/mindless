import { Octokit } from '@octokit/rest';

interface RepoInfo {
  domain: string;
  owner: string;
  repo: string;
}

const URL_RE = /^https?:\/\/(github\.com|gitlab\.com)\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/)?$/;

export function parseRepoUrl(url: string): RepoInfo | null {
  const match = url.trim().match(URL_RE);
  if (!match) return null;
  return { domain: match[1], owner: match[2], repo: match[3] };
}

export function createOctokit(pat: string, domain: string): Octokit {
  if (domain === 'gitlab.com') {
    return new Octokit({
      auth: pat,
      baseUrl: 'https://gitlab.com/api/v4',
    });
  }
  return new Octokit({ auth: pat });
}

export async function getFileSha(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
): Promise<string | undefined> {
  try {
    const res = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner, repo, path,
    });
    if (Array.isArray(res.data)) return undefined;
    return res.data.sha;
  } catch {
    return undefined;
  }
}

async function uploadFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
): Promise<void> {
  const sha = await getFileSha(octokit, owner, repo, path);
  await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
    owner, repo, path, message,
    content: btoa(unescape(encodeURIComponent(content))),
    ...(sha ? { sha } : {}),
  });
}

export async function uploadBinaryFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  base64Content: string,
  message: string,
): Promise<void> {
  const sha = await getFileSha(octokit, owner, repo, path);
  await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
    owner, repo, path, message,
    content: base64Content,
    ...(sha ? { sha } : {}),
  });
}

export async function deleteFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  sha: string,
  message: string,
): Promise<void> {
  await octokit.request('DELETE /repos/{owner}/{repo}/contents/{path}', {
    owner, repo, path, message, sha,
  });
}

export async function getFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
): Promise<string | null> {
  try {
    const res = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner, repo, path,
    });
    if (Array.isArray(res.data)) return null;
    if (res.data.type !== 'file' || !('content' in res.data)) return null;
    return decodeURIComponent(escape(atob(res.data.content)));
  } catch {
    return null;
  }
}

export async function testConnection(
  pat: string,
  repoUrl: string,
): Promise<{ success: boolean; error?: string }> {
  const info = parseRepoUrl(repoUrl);
  if (!info) return { success: false, error: 'invalid_url' };

  try {
    const octokit = createOctokit(pat, info.domain);

    // Verify repo access
    await octokit.request('GET /repos/{owner}/{repo}', {
      owner: info.owner, repo: info.repo,
    });

    const testFile = 'mindless-test.txt';
    const testContent = 'This is a attempt to upload mindless data';
    const testPath = `mindless-data/${testFile}`;

    // Upload test file
    await uploadFile(octokit, info.owner, info.repo, testPath, testContent, 'Mindless: test write permission');

    // Read it back
    const readBack = await getFileContent(octokit, info.owner, info.repo, testPath);
    if (readBack !== testContent) {
      return { success: false, error: 'content_mismatch' };
    }

    // Clean up
    const sha = await getFileSha(octokit, info.owner, info.repo, testPath);
    if (sha) {
      await deleteFile(octokit, info.owner, info.repo, testPath, sha, 'Mindless: clean up test file').catch(() => {});
    }

    return { success: true };
  } catch (err: any) {
    console.error('Connection test failed:', err);
    return { success: false, error: err.message || 'unknown_error' };
  }
}

export async function syncToRepo(
  pat: string,
  repoUrl: string,
  exportJson: string,
  dbBase64: string,
): Promise<{ success: boolean; error?: string }> {
  const info = parseRepoUrl(repoUrl);
  if (!info) return { success: false, error: 'invalid_url' };

  try {
    const octokit = createOctokit(pat, info.domain);
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const msg = `Mindless: sync data ${now}`;

    // Upload JSON export
    await uploadFile(octokit, info.owner, info.repo, 'mindless-data/mindless.json', exportJson, msg);

    // Upload raw DB file
    await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
      owner: info.owner,
      repo: info.repo,
      path: 'mindless-data/mindless.db',
      message: msg,
      content: dbBase64,
      ...(await getFileSha(octokit, info.owner, info.repo, 'mindless-data/mindless.db') ? { sha: await getFileSha(octokit, info.owner, info.repo, 'mindless-data/mindless.db') } : {}),
    });

    return { success: true };
  } catch (err: any) {
    console.error('Sync failed:', err);
    return { success: false, error: err.message || 'unknown_error' };
  }
}
