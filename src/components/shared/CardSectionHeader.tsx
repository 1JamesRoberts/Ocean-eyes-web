import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface CardSectionHeaderProps {
  icon: LucideIcon;
  title: React.ReactNode;
  action?: React.ReactNode;
  detail?: React.ReactNode;
  className?: string;
}

export const CardSectionHeader: React.FC<CardSectionHeaderProps> = ({
  icon: Icon,
  title,
  action,
  detail,
  className = '',
}) => (
  <div className={`mb-4 flex items-start justify-between gap-3 ${className}`}>
    <div className="flex min-w-0 items-start gap-2">
      <Icon size={16} strokeWidth={2.5} className="mt-0.5 shrink-0 text-brand" />
      <div className="min-w-0">
        <h3 className="text-xs font-medium tracking-widest text-text-muted uppercase">
          {title}
        </h3>
        {detail && (
          <p className="mt-1 text-xs leading-snug text-text-muted">
            {detail}
          </p>
        )}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
