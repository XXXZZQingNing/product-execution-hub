import type { AppDb, Developer, ExecutionPlan, ExecutionTask, Product, TaskStatus } from '../types';
import { emptyDb } from './github';
import { now } from './utils';

const TASK_STATUSES: TaskStatus[] = ['todo', 'doing', 'done'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function normalizeTask(value: unknown): ExecutionTask | null {
  if (!isRecord(value)) return null;
  const status = TASK_STATUSES.includes(value.status as TaskStatus)
    ? (value.status as TaskStatus)
    : 'todo';
  const title = asString(value.title).trim();
  if (!title) return null;
  return {
    id: asString(value.id) || crypto.randomUUID(),
    title,
    status,
    feedback: asString(value.feedback),
  };
}

function normalizeDeveloper(value: unknown): Developer | null {
  if (!isRecord(value)) return null;
  const name = asString(value.name).trim();
  if (!name) return null;
  return {
    id: asString(value.id) || crypto.randomUUID(),
    name,
    note: asString(value.note),
    createdAt: asString(value.createdAt) || now(),
  };
}

function normalizeProduct(value: unknown): Product | null {
  if (!isRecord(value)) return null;
  const name = asString(value.name).trim();
  const developerId = asString(value.developerId).trim();
  if (!name || !developerId) return null;

  const referenceLinks = Array.isArray(value.referenceLinks)
    ? value.referenceLinks
        .map((link) => {
          if (!isRecord(link)) return null;
          const url = asString(link.url).trim();
          if (!url) return null;
          return {
            id: asString(link.id) || crypto.randomUUID(),
            label: asString(link.label),
            url,
          };
        })
        .filter((link): link is Product['referenceLinks'][number] => link !== null)
    : [];

  return {
    id: asString(value.id) || crypto.randomUUID(),
    developerId,
    name,
    requirements: asString(value.requirements),
    referenceImages: asStringArray(value.referenceImages),
    referenceLinks,
    hardware: asStringArray(value.hardware),
    createdAt: asString(value.createdAt) || now(),
  };
}

function normalizeExecution(value: unknown): ExecutionPlan | null {
  if (!isRecord(value)) return null;
  const name = asString(value.name).trim();
  if (!name) return null;
  const tasks = Array.isArray(value.tasks)
    ? value.tasks.map(normalizeTask).filter((task): task is ExecutionTask => task !== null)
    : [];
  return {
    id: asString(value.id) || crypto.randomUUID(),
    name,
    plan: asString(value.plan),
    tasks,
    createdAt: asString(value.createdAt) || now(),
  };
}

export function normalizeDb(value: unknown): AppDb {
  if (!isRecord(value)) return emptyDb();

  const developers = Array.isArray(value.developers)
    ? value.developers.map(normalizeDeveloper).filter((item): item is Developer => item !== null)
    : [];
  const products = Array.isArray(value.products)
    ? value.products.map(normalizeProduct).filter((item): item is Product => item !== null)
    : [];
  const executions = Array.isArray(value.executions)
    ? value.executions.map(normalizeExecution).filter((item): item is ExecutionPlan => item !== null)
    : [];

  return {
    developers,
    products,
    executions,
    updatedAt: asString(value.updatedAt) || now(),
  };
}
