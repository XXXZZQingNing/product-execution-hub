import type { MouseEvent } from 'react';
import { ExternalLink, Link2 } from 'lucide-react';
import type { ReferenceLink } from '../../types';
import { formatLinkDisplay } from '../../lib/utils';

export function ReferenceLinkList({
  links,
  onClickLink,
}: {
  links: ReferenceLink[];
  onClickLink?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  if (links.length === 0) return null;

  return (
    <div className="space-y-2">
      {links.map((link) => (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noreferrer"
          title={link.label.trim() ? `${link.label} · ${link.url}` : link.url}
          className="group/link flex items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:border-blue-100 hover:bg-blue-50/60 hover:text-blue-700"
          onClick={onClickLink}
        >
          <Link2 size={15} className="shrink-0 text-blue-400 group-hover/link:text-blue-600" />
          <span className="min-w-0 flex-1 truncate">{formatLinkDisplay(link.label, link.url)}</span>
          <ExternalLink
            size={13}
            className="shrink-0 opacity-40 transition-opacity group-hover/link:opacity-100"
          />
        </a>
      ))}
    </div>
  );
}
