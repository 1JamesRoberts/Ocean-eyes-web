import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface CardSectionHeaderProps {
  icon: LucideIcon;
  title: React.ReactNode;
  action?: React.ReactNode;
  detail?: React.ReactNode;
  className?: string;
  iconClassName?: string;
}

export const CardSectionHeader: React.FC<CardSectionHeaderProps> = ({
  icon: Icon,
  title,
  action,
  className = '',
  iconClassName = 'text-text',
}) => (
  <div className={`-mt-1 mb-2 flex items-start justify-between gap-3 ${className}`}>
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
