import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const ghRepo = process.env.GITHUB_REPOSITORY || 'XXXZZQingNing/product-execution-hub';
const [repoOwner, repoName] = ghRepo.split('/');

export default defineConfig({
  plugins: [react()],
  base: repoName ? `/${repoName}/` : '/',
  define: {
    'import.meta.env.VITE_GITHUB_OWNER': JSON.stringify(repoOwner),
    'import.meta.env.VITE_GITHUB_REPO': JSON.stringify(repoName),
    'import.meta.env.VITE_GITHUB_BRANCH': JSON.stringify('main'),
  },
});
