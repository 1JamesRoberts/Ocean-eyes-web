import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface CardSectionHeaderProps {
  icon: LucideIcon;
  title: React.ReactNode;
  action?: React.ReactNode;
  divider?: boolean;
  className?: string;
  iconClassName?: string;
}

export const CardSectionHeader: React.FC<CardSectionHeaderProps> = ({
  icon: Icon,
  title,
  action,
  divider = true,
  className = '',
  iconClassName = 'text-text',
}) => (
  <div className={`
    -mt-1 flex items-start justify-between gap-3
    ${divider ? 'mb-2.5 border-b border-text-muted/15 pb-2.5' : 'mb-2'}
    ${className}
  `}>
    <div className="flex min-w-0 items-start gap-2">
      <Icon size={16} strokeWidth={2.5} className={`mt-0.5 shrink-0 ${iconClassName}`} />
      <div className="min-w-0">
        <h3 className="type-title text-text">
          {title}
        </h3>
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
