export type TaskStatus = 'todo' | 'doing' | 'done';

export type ReferenceLink = {
  id: string;
  label: string;
  url: string;
};

export type Developer = {
  id: string;
  name: string;
  note: string;
  createdAt: string;
};

export type Product = {
  id: string;
  developerId: string;
  name: string;
  requirements: string;
  referenceImages: string[];
  referenceLinks: ReferenceLink[];
  hardware: string[];
  createdAt: string;
};

export type ExecutionTask = {
  id: string;
  title: string;
  status: TaskStatus;
  feedback: string;
};

export type ExecutionPlan = {
  id: string;
  name: string;
  plan: string;
  tasks: ExecutionTask[];
  createdAt: string;
};

export type MediaAsset = {
  path: string;
  name: string;
  downloadUrl: string;
  type: 'image' | 'video' | 'file';
  sha?: string;
};

export type AppDb = {
  developers: Developer[];
  products: Product[];
  executions: ExecutionPlan[];
  updatedAt: string;
};

export type RepoRef = {
  owner: string;
  repo: string;
  branch: string;
};

export type GithubConfig = RepoRef & {
  token: string;
};
