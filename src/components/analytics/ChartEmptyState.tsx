// ChartEmptyState.tsx - Reusable empty-state placeholder for chart components
import React from 'react';

interface Props {
  message: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
}

export const ChartEmptyState = React.memo<Props>(({ message, hint, action, className = '' }) => {
  const layout = hint || action 
    ? "flex items-center justify-center text-text-muted text-sm flex-col gap-2 text-center px-6" 
    : "flex items-center justify-center text-text-muted text-sm";

  return (
    <div className={`
      ${layout}
      min-h-[120px]
      ${className || 'h-[240px]'}
    `}>
      <span>{message}</span>
      {hint && <span className="text-xs opacity-70">{hint}</span>}
      {action && (
        <div className={hint ? "mt-3" : "mt-2"}>
          {action}
        </div>
      )}
    </div>
  );
});

ChartEmptyState.displayName = 'ChartEmptyState';
