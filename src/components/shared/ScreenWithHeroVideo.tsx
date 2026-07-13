import React, { useState } from 'react';
import { HeroActionLayerContext } from './HeroActionLayerContext';

interface ScreenWithHeroVideoProps {
  /** Hero content rendered inside the stationary background layer. */
  hero: React.ReactNode;
  /** When false the hero is visually hidden but stays mounted to preserve the `MediaStream`. Default `true`. */
  showHero?: boolean;
  /** Screen-specific content rendered below the hero. */
  children: React.ReactNode;
}

export const ScreenWithHeroVideo: React.FC<ScreenWithHeroVideoProps> = ({
  hero,
  showHero = true,
  children,
}) => {
  const [heroActionLayer, setHeroActionLayer] = useState<HTMLElement | null>(null);

  return (
    <HeroActionLayerContext.Provider value={heroActionLayer}>
      <div className="bg-gradient-mint relative flex min-h-0 w-full flex-1 flex-col">
        <section
          className={`
            mobile-hero-video
            ${showHero ? 'block' : 'hidden'}
          `}
        >
          <div className="mobile-hero-media">
            {hero}
          </div>
          <div
            ref={setHeroActionLayer}
            className="
              pointer-events-none absolute top-0 right-0 left-0 z-30
              h-[var(--mobile-hero-height)]
            "
          />
          {showHero && (
            <>
              <div className="mobile-hero-blend" aria-hidden="true" />
              <div className="mobile-hero-surface" aria-hidden="true" />
            </>
          )}
        </section>
        <div
          data-mobile-screen-scroll
          data-mobile-hero-scroll-layer
          className={`
            relative z-30 -mx-4 flex min-h-0 flex-1
            flex-col overflow-y-auto px-4
            ${showHero
              ? '-mt-4 bg-transparent mobile-hero-content-mask'
              : 'bg-gradient-mint'}
          `}
        >
          <div
            data-mobile-hero-masked-content
            className="flex min-h-full flex-col pb-[calc(6.5rem+env(safe-area-inset-bottom))]"
          >
            {showHero && (
              <div
                data-mobile-hero-content-spacer
                className="h-[calc(var(--mobile-hero-height)+1.25rem)] shrink-0"
                aria-hidden="true"
              />
            )}
            {children}
          </div>
        </div>
      </div>
    </HeroActionLayerContext.Provider>
  );
};
