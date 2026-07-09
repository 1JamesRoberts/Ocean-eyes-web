import React, { useState } from 'react';
import { HeroActionLayerContext } from './HeroActionLayerContext';
import { TabPageDots } from './TabPageDots';

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
      <div className="flex w-full flex-1 flex-col bg-black">
        <section
          className={`
            mobile-hero-video
            ${showHero ? 'block' : 'hidden'}
          `}
        >
          {hero}
          <div
            ref={setHeroActionLayer}
            className="pointer-events-none absolute inset-0 z-30"
          />
        </section>
        {showHero && (
          <div className="mobile-hero-corner-overlay">
            <div
              aria-hidden="true"
              className="mobile-hero-corner mobile-hero-corner-left"
            />
            <div
              aria-hidden="true"
              className="mobile-hero-corner mobile-hero-corner-right"
            />
          </div>
        )}
        <div className="relative z-10 -mx-4 flex flex-1 flex-col bg-gradient-mint px-4 pb-28">
          {showHero && (
            <div className="flex h-5 items-center justify-center">
              <TabPageDots />
            </div>
          )}
          {children}
        </div>
      </div>
    </HeroActionLayerContext.Provider>
  );
};
