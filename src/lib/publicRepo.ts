import type { RepoRef } from '../types';

export function getPublicRepo(): RepoRef {
  return {
    owner: import.meta.env.VITE_GITHUB_OWNER || 'XXXZZQingNing',
    repo: import.meta.env.VITE_GITHUB_REPO || 'product-execution-hub',
    branch: import.meta.env.VITE_GITHUB_BRANCH || 'main',
  };
}
