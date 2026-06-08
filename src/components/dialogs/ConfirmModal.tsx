import type { ConfirmDialogState } from '../../types/ui';
import { Modal } from '../ui/Modal';

export function ConfirmModal({
  title,
  message,
  confirmLabel = '确定',
  danger,
  onClose,
  onConfirm,
}: ConfirmDialogState & { onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-slate-600">{message}</p>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button className="btn btn-secondary" onClick={onClose}>
            取消
          </button>
          <button className={`btn shadow-md ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
