import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface CardSectionHeaderProps {
  icon: LucideIcon;
  title: React.ReactNode;
  action?: React.ReactNode;
  divider?: boolean;
  className?: string;
}

export const CardSectionHeader: React.FC<CardSectionHeaderProps> = ({
  icon: Icon,
  title,
  action,
  divider = true,
  className = '',
}) => (
  <div className={`
    -mt-1 flex items-start justify-between gap-3
    ${divider ? 'mb-1 border-b border-slate-grey/15 pb-2' : 'mb-2'}
    ${className}
  `}>
    <div className="flex min-w-0 items-start gap-2">
      <Icon size={16} strokeWidth={2.5} className="mt-0.5 shrink-0 text-prussian-blue" />
      <div className="min-w-0">
        <h3 className="type-title text-prussian-blue">
          {title}
        </h3>
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
