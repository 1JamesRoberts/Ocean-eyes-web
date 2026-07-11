import type React from 'react';

interface ScreenHeaderProps {
  eyebrow: string;
  action?: React.ReactNode;
  className?: string;
}

/** A compact, semantic screen heading for primary and secondary destinations. */
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  eyebrow,
  action,
  className = '',
}) => (
  <header className={`-mt-1 flex min-h-6 items-center justify-between gap-4 ${className}`}>
    <div className="min-w-0">
      <h1 className="text-xs font-semibold tracking-[0.12em] text-brand uppercase">
        {eyebrow}
      </h1>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </header>
);
