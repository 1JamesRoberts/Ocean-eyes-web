import type React from 'react';
import { createPortal } from 'react-dom';
import { useHeroActionLayer } from './HeroActionLayerContext';

interface ScreenHeaderProps {
  eyebrow: string;
  action?: React.ReactNode;
  className?: string;
}

/** A semantic screen heading and action group rendered over the shared hero. */
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  eyebrow,
  action,
  className = '',
}) => {
  const heroActionLayer = useHeroActionLayer();

  if (!heroActionLayer) {
    return (
      <header className={`-mt-1 flex min-h-6 items-center justify-between gap-4 ${className}`}>
        <h1 className="text-xs font-semibold tracking-[0.11em] text-accent-ink uppercase">
          {eyebrow}
        </h1>
        {action && <div className="shrink-0">{action}</div>}
      </header>
    );
  }

  return createPortal(
    <header className={`pointer-events-none absolute inset-0 ${className}`}>
      <h1 className="absolute bottom-4 left-4 text-xs font-semibold tracking-[0.11em] text-white uppercase drop-shadow-sm">
        {eyebrow}
      </h1>
      {action && (
        <div
          className="pointer-events-auto absolute top-3 right-4 z-10 [&_button]:text-white"
          onClick={(event) => event.stopPropagation()}
        >
          {action}
        </div>
      )}
    </header>,
    heroActionLayer,
  );
};
