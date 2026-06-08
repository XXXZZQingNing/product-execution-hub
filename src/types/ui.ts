import type { Product } from '../types';

export type ModuleKey = 'products' | 'execution' | 'media';

export type ProductDraft = Omit<Product, 'id' | 'developerId' | 'createdAt'>;

export type PromptDialogState = {
  title: string;
  label: string;
  defaultValue?: string;
  confirmLabel?: string;
  onSubmit: (value: string) => void;
};

export type ConfirmDialogState = {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
};
