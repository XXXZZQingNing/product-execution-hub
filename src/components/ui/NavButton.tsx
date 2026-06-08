import type { ReactNode } from 'react';

export function NavButton({
  icon,
  active,
  title,
  subtitle,
  onClick,
}: {
  icon: ReactNode;
  active: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`group flex w-full items-center gap-3.5 rounded-2xl p-3 text-left transition-all duration-200 ${
        active ? 'bg-white shadow-sm ring-1 ring-slate-200/50' : 'hover:bg-slate-200/50'
      }`}
      onClick={onClick}
    >
      <span
        className={`grid size-10 place-items-center rounded-xl transition-colors ${
          active
            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
            : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
        }`}
      >
        {icon}
      </span>
      <span>
        <span
          className={`block font-bold ${active ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'}`}
        >
          {title}
        </span>
        <span
          className={`block text-xs font-medium ${active ? 'text-slate-500' : 'text-slate-400 group-hover:text-slate-500'}`}
        >
          {subtitle}
        </span>
      </span>
    </button>
  );
}
