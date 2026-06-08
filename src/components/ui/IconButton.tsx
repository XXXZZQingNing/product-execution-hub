import type { MouseEvent, ReactNode } from 'react';

export function IconButton({
  label,
  danger,
  children,
  onClick,
}: {
  label: string;
  danger?: boolean;
  children: ReactNode;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      className={`grid size-8 place-items-center rounded-full transition-all duration-200 ${
        danger
          ? 'bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white hover:shadow-md hover:shadow-rose-500/20'
          : 'bg-white/80 text-slate-500 shadow-sm border border-slate-200 hover:bg-slate-100 hover:text-slate-700'
      }`}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
