import { useState } from 'react';
import type { PromptDialogState } from '../../types/ui';
import { Modal } from '../ui/Modal';

export function PromptModal({
  title,
  label,
  defaultValue = '',
  confirmLabel = '确定',
  onClose,
  onSubmit,
}: PromptDialogState & { onClose: () => void; onSubmit: (value: string) => void }) {
  const [value, setValue] = useState(defaultValue);

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-bold uppercase tracking-wider text-slate-500">
            {label}
          </span>
          <input
            className="field"
            value={value}
            autoFocus
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onSubmit(value);
            }}
          />
        </label>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button className="btn btn-secondary" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary shadow-md" onClick={() => onSubmit(value)} disabled={!value.trim()}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
