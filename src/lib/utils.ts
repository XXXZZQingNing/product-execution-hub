import type { GithubConfig, RepoRef } from '../types';
import { CONFIG_KEY } from '../constants';
import { rawUrl } from './github';

export const newId = () => crypto.randomUUID();
export const now = () => new Date().toISOString();

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function shortName(value: string) {
  return value.split('/').pop() || value;
}

export function formatLinkDisplay(label: string, url: string, maxLength = 42) {
  const text = label.trim() || url;
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

export function resolveMediaUrl(repo: RepoRef, pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return rawUrl(repo, pathOrUrl);
}

export function isVideoPath(pathOrUrl: string) {
  return /\.(mp4|mov|webm|m4v)$/i.test(pathOrUrl);
}

export function readStoredToken() {
  const raw = localStorage.getItem(CONFIG_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { token?: string } & Partial<GithubConfig>;
    return parsed.token?.trim() || null;
  } catch {
    localStorage.removeItem(CONFIG_KEY);
    return null;
  }
}

export const starterProductDraft = () => ({
  name: '',
  requirements: '',
  referenceImages: [] as string[],
  referenceLinks: [] as import('../types').ReferenceLink[],
  hardware: [] as string[],
});
