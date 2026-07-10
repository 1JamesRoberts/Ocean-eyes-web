import type React from 'react';

interface ScreenHeaderProps {
  eyebrow: string;
  action?: React.ReactNode;
  className?: string;
}

/** A consistent identity header for primary app destinations. */
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  eyebrow,
  action,
  className = '',
}) => (
  <header className={`flex items-end justify-between gap-4 ${className}`}>
    <div className="min-w-0">
      <p className="text-xs font-semibold tracking-[0.12em] text-brand uppercase">
        {eyebrow}
      </p>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </header>
);
