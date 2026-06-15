import type { ProductStatus, TaskPriority, TaskStatus } from './types';

export const CONFIG_KEY = 'product-execution-hub.github-config';
export const AUTO_SYNC_MS = 30_000;

export const statuses: Array<{ key: TaskStatus; label: string }> = [
  { key: 'todo', label: '待办' },
  { key: 'doing', label: '进行中' },
  { key: 'done', label: '已完成' },
];

export const taskPriorities: Array<{ key: TaskPriority; label: string; colorClass: string }> = [
  { key: 'high', label: '高优', colorClass: 'bg-rose-100 text-rose-700' },
  { key: 'medium', label: '中优', colorClass: 'bg-amber-100 text-amber-700' },
  { key: 'low', label: '低优', colorClass: 'bg-slate-100 text-slate-700' },
];

export const productStatuses: Array<{ key: ProductStatus; label: string }> = [
  { key: 'developing', label: '开发中' },
  { key: 'shipped', label: '已上线' },
];
