import React from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';

interface GlassDisclosurePanelProps {
  icon: LucideIcon;
  title: React.ReactNode;
  detail?: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  iconClassName?: string;
  chevronClassName?: string;
}

export const GlassDisclosurePanel: React.FC<GlassDisclosurePanelProps> = ({
  icon: Icon,
  title,
  detail,
  expanded,
  onToggle,
  children,
  className = '',
  contentClassName = 'flex flex-col gap-4 pt-4',
  iconClassName = 'text-text-muted',
  chevronClassName = 'text-brand',
}) => (
  <div className={`rounded-2xl border border-white/20 bg-white/20 p-3 ${className}`}>
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="flex w-full cursor-pointer items-center justify-between gap-3 border-none bg-transparent p-0 text-left"
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
        className={`shrink-0 transition-transform duration-300 ease-in-out ${chevronClassName} ${expanded ? 'rotate-90' : ''}`}
      />
    </button>

    <div
      className={`
        grid transition-[grid-template-rows_0.35s_cubic-bezier(0.4,0,0.2,1)]
        ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}
      `}
    >
      <div className="overflow-hidden">
        <div
          className={`
            ${contentClassName}
            transition-[opacity_0.3s_ease,transform_0.35s_cubic-bezier(0.4,0,0.2,1)]
            ${expanded ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'}
          `}
        >
          {children}
        </div>
      </div>
    </div>
  </div>
);
