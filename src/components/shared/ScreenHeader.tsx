import type React from 'react';

interface ScreenHeaderProps {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
  className?: string;
}

/** A consistent identity header for primary app destinations. */
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  eyebrow,
  title,
  action,
  className = '',
}) => (
  <header className={`flex items-end justify-between gap-4 ${className}`}>
    <div className="min-w-0">
      <p className="mb-1 text-xs font-semibold tracking-[0.12em] text-brand uppercase">
        {eyebrow}
      </p>
      <h1 className="text-display leading-none font-extrabold tracking-[-0.03em] text-text">
        {title}
      </h1>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </header>
);
