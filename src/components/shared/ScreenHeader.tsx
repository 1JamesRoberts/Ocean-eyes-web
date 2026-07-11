import type React from 'react';

interface ScreenHeaderProps {
  eyebrow: string;
  action?: React.ReactNode;
  className?: string;
}

/** A consistent identity header and hero-to-content offset for primary app destinations. */
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  eyebrow,
  action,
  className = '',
}) => (
  <header className={`-mt-2 -mb-1 flex h-5 items-center justify-between gap-4 ${className}`}>
    <div className="min-w-0">
      <p className="text-xs font-semibold tracking-[0.12em] text-brand uppercase">
        {eyebrow}
      </p>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </header>
);
