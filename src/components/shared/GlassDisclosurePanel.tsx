import React from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { CollapsibleContent } from './CollapsibleContent';
import { GlassPanel } from './GlassPanel';

interface GlassDisclosurePanelProps {
  icon: LucideIcon;
  title: React.ReactNode;
  detail?: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  iconClassName?: string;
}

export const GlassDisclosurePanel: React.FC<GlassDisclosurePanelProps> = ({
  icon: Icon,
  title,
  detail,
  expanded,
  onToggle,
  children,
  iconClassName = 'text-slate-grey',
}) => (
  <GlassPanel>
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 border-none bg-transparent p-0 text-left"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${iconClassName}`}>
          <Icon size={17} />
        </span>
        <span className="min-w-0">
          <span className="block type-strong">{title}</span>
          {detail && (
            <span className="mt-0.5 block type-caption">
              {detail}
            </span>
          )}
        </span>
      </span>
      <ChevronRight
        size={18}
        className={`shrink-0 text-slate-grey transition-transform duration-300 ease-in-out ${expanded ? 'rotate-90' : ''}`}
      />
    </button>

    <CollapsibleContent expanded={expanded} className="flex flex-col gap-4 pt-3">
      {children}
    </CollapsibleContent>
  </GlassPanel>
);
