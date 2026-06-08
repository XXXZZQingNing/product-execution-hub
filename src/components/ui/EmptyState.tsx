import { ClipboardList } from 'lucide-react';

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="glass-panel rounded-2xl p-10 text-center border-dashed border-slate-300 bg-slate-50/50 shadow-none">
      <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm border border-slate-100">
        <ClipboardList size={28} strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-bold text-slate-900">{title}</h3>
      <p className="mx-auto mt-2.5 max-w-md text-sm font-medium leading-relaxed text-slate-500">
        {description}
      </p>
    </div>
  );
}
