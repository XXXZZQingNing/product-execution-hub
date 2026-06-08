import type { ReactNode } from 'react';

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm transition-all">
      <div className="glass-panel max-h-[92vh] w-full max-w-3xl overflow-auto rounded-3xl p-6 md:p-8 shadow-2xl scrollbar-soft">
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <h3 className="text-2xl font-extrabold text-slate-900">{title}</h3>
          <button className="btn btn-secondary px-4 shadow-sm" onClick={onClose}>
            关闭
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
