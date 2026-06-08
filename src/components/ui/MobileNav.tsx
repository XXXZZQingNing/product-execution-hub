import type { ModuleKey } from '../../types/ui';

export function MobileNav({
  active,
  onChange,
}: {
  active: ModuleKey;
  onChange: (key: ModuleKey) => void;
}) {
  return (
    <select
      className="field block w-auto py-2 pr-8 font-bold text-slate-700 shadow-sm lg:hidden"
      value={active}
      onChange={(event) => onChange(event.target.value as ModuleKey)}
    >
      <option value="products">产品开发</option>
      <option value="execution">执行模块</option>
      <option value="media">媒体库</option>
    </select>
  );
}
