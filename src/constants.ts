import type { TaskStatus } from './types';

export const CONFIG_KEY = 'product-execution-hub.github-config';
export const AUTO_SYNC_MS = 30_000;

export const statuses: Array<{ key: TaskStatus; label: string }> = [
  { key: 'todo', label: '待办' },
  { key: 'doing', label: '进行中' },
  { key: 'done', label: '已完成' },
];
