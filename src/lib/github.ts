import type { AppDb, GithubConfig, MediaAsset, RepoRef } from '../types';

const API_ROOT = 'https://api.github.com';
export const DB_PATH = 'data/db.json';
export const MEDIA_DIR = 'media';

export const emptyDb = (): AppDb => ({
  developers: [],
  products: [],
  executions: [],
  updatedAt: new Date().toISOString(),
});

type GithubContentResponse = {
  type: 'file' | 'dir';
  name: string;
  path: string;
  sha: string;
  content?: string;
  download_url?: string;
};

const headers = (config: GithubConfig) => ({
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${config.token}`,
  'X-GitHub-Api-Version': '2022-11-28',
});

const contentUrl = (config: GithubConfig, path: string) =>
  `${API_ROOT}/repos/${config.owner}/${config.repo}/contents/${path}`;

async function githubRequest<T>(
  config: GithubConfig,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(contentUrl(config, path), {
    ...init,
    headers: {
      ...headers(config),
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`GitHub API ${response.status}: ${message}`);
  }

  return response.json() as Promise<T>;
}

export async function testGithubConnection(config: GithubConfig) {
  const response = await fetch(`${API_ROOT}/repos/${config.owner}/${config.repo}`, {
    method: 'GET',
    headers: headers(config),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`GitHub API ${response.status}: ${message}`);
  }
}

export async function readDbPublic(ref: RepoRef): Promise<{ db: AppDb }> {
  const response = await fetch(rawUrl(ref, DB_PATH));
  if (!response.ok) {
    if (response.status === 404) {
      return { db: emptyDb() };
    }
    throw new Error(`读取数据失败 ${response.status}`);
  }
  return { db: (await response.json()) as AppDb };
}

export async function listMediaPublic(ref: RepoRef): Promise<MediaAsset[]> {
  try {
    const response = await fetch(
      `${API_ROOT}/repos/${ref.owner}/${ref.repo}/contents/${MEDIA_DIR}?ref=${encodeURIComponent(ref.branch)}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );
    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`读取媒体失败 ${response.status}`);
    }
    const files = (await response.json()) as GithubContentResponse[];
    return files
      .filter((file) => file.type === 'file')
      .map((file) => ({
        path: file.path,
        name: file.name,
        sha: file.sha,
        downloadUrl: rawUrl(ref, file.path),
        type: mediaType(file.name),
      }));
  } catch (error) {
    if (String(error).includes('404')) {
      return [];
    }
    throw error;
  }
}

export async function readDb(config: GithubConfig): Promise<{ db: AppDb; sha?: string }> {
  try {
    const file = await githubRequest<GithubContentResponse>(
      config,
      `${DB_PATH}?ref=${encodeURIComponent(config.branch)}`,
    );
    const decoded = decodeURIComponent(
      escape(window.atob((file.content ?? '').replace(/\n/g, ''))),
    );
    return { db: JSON.parse(decoded) as AppDb, sha: file.sha };
  } catch (error) {
    if (String(error).includes('GitHub API 404')) {
      return { db: emptyDb() };
    }
    throw error;
  }
}

export async function writeDb(config: GithubConfig, db: AppDb) {
  let sha: string | undefined;
  try {
    const existing = await githubRequest<GithubContentResponse>(
      config,
      `${DB_PATH}?ref=${encodeURIComponent(config.branch)}`,
    );
    sha = existing.sha;
  } catch (error) {
    if (!String(error).includes('GitHub API 404')) {
      throw error;
    }
  }

  const nextDb = { ...db, updatedAt: new Date().toISOString() };
  const content = window.btoa(unescape(encodeURIComponent(JSON.stringify(nextDb, null, 2))));
  await githubRequest(config, DB_PATH, {
    method: 'PUT',
    body: JSON.stringify({
      message: `Update ${DB_PATH}`,
      content,
      branch: config.branch,
      sha,
    }),
  });
  return nextDb;
}

export async function uploadMedia(config: GithubConfig, file: File) {
  const safeName = file.name.replace(/[^\w.\-]+/g, '-');
  const path = `${MEDIA_DIR}/${Date.now()}-${safeName}`;
  const content = await fileToBase64(file);
  await githubRequest(config, path, {
    method: 'PUT',
    body: JSON.stringify({
      message: `Upload ${path}`,
      content,
      branch: config.branch,
    }),
  });
  return path;
}

export async function listMedia(config: GithubConfig): Promise<MediaAsset[]> {
  try {
    const files = await githubRequest<GithubContentResponse[]>(
      config,
      `${MEDIA_DIR}?ref=${encodeURIComponent(config.branch)}`,
    );
    return files
      .filter((file) => file.type === 'file')
      .map((file) => ({
        path: file.path,
        name: file.name,
        sha: file.sha,
        downloadUrl: rawUrl(config, file.path),
        type: mediaType(file.name),
      }));
  } catch (error) {
    if (String(error).includes('GitHub API 404')) {
      return [];
    }
    throw error;
  }
}

export async function deleteMedia(config: GithubConfig, asset: MediaAsset) {
  if (!asset.sha) return;
  await githubRequest(config, asset.path, {
    method: 'DELETE',
    body: JSON.stringify({
      message: `Delete ${asset.path}`,
      sha: asset.sha,
      branch: config.branch,
    }),
  });
}

export function rawUrl(ref: RepoRef, path: string) {
  return `https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${ref.branch}/${path}`;
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function mediaType(name: string): MediaAsset['type'] {
  const lower = name.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|svg)$/.test(lower)) return 'image';
  if (/\.(mp4|mov|webm|m4v)$/.test(lower)) return 'video';
  return 'file';
}
