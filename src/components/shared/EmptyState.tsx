// EmptyState.tsx - Reusable empty / loading / error placeholder
import React from 'react';
import type { LucideIcon } from 'lucide-react';

export type EmptyStateSize = 'sm' | 'md';

interface EmptyStateProps {
  icon?: LucideIcon;
  message: string;
  hint?: string;
  action?: React.ReactNode;
  size?: EmptyStateSize;
  className?: string;
}

const sizeMap: Record<EmptyStateSize, { height: string; icon: string; message: string; hint: string }> = {
  sm: {
    height: 'h-[160px]',
    icon: 'size-8',
    message: 'text-sm',
    hint: 'text-xs',
  },
  md: {
    height: 'h-[240px]',
    icon: 'size-10',
    message: 'text-sm',
    hint: 'text-xs',
  },
};

/**
 * Reusable empty-state placeholder used for charts, lists, and panels.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  message,
  hint,
  action,
  size = 'md',
  className = '',
}) => {
  const sizes = sizeMap[size];

  return (
    <div
      className={`
        flex flex-col items-center justify-center gap-2 text-center
        text-text-muted
        ${sizes.height}
        px-6
        ${className}
      `}
    >
      {Icon && <Icon className={`
        ${sizes.icon}
        opacity-60
      `} aria-hidden="true" />}
      <span className={`
        font-medium
        ${sizes.message}
      `}>{message}</span>
      {hint && <span className={`
        max-w-xs opacity-70
        ${sizes.hint}
      `}>{hint}</span>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
};
