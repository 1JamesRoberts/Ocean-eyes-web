import React, { useState } from 'react';
import { HeroActionLayerContext } from './HeroActionLayerContext';


interface ScreenWithHeroVideoProps {
  /** Hero content rendered inside the sticky section. */
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
      <div className="bg-gradient-mint flex w-full flex-1 flex-col">
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
          data-mobile-hero-scroll-layer
          className={`
            relative z-30 -mx-4 flex flex-1 flex-col px-4
            ${showHero ? 'bg-transparent' : 'bg-gradient-mint'}
          `}
        >
          {showHero && (
            <div
              data-mobile-hero-content-spacer
              className="h-5 translate-y-1"
              aria-hidden="true"
            />
          )}
          {children}
        </div>
      </div>
    </HeroActionLayerContext.Provider>
  );
};
