import React, { useState } from 'react';
import {
  HeroActionLayerContext,
  HeroMediaLayerContext,
} from './HeroActionLayerContext';
import { AmbientVideoBackdrop } from './AmbientVideoBackdrop';
import type { CameraFilters } from '../../types/aquarium';

interface AmbientVideoSettings {
  filters?: CameraFilters;
  temperatureOverlay?: React.CSSProperties | null;
  tintOverlay?: React.CSSProperties | null;
  canvasStyle?: React.CSSProperties;
}

interface ScreenWithHeroVideoProps {
  /** Hero content rendered inside the stationary background layer. */
  hero: React.ReactNode;
  /** When false the hero is visually hidden but stays mounted to preserve the `MediaStream`. Default `true`. */
  showHero?: boolean;
  /** Screen-specific content rendered below the hero. */
  children: React.ReactNode;
  /** Camera adjustments mirrored by the ambient video layer. */
  ambientVideo?: AmbientVideoSettings;
}

export const ScreenWithHeroVideo: React.FC<ScreenWithHeroVideoProps> = ({
  hero,
  showHero = true,
  children,
  ambientVideo,
}) => {
  const [heroActionLayer, setHeroActionLayer] = useState<HTMLElement | null>(null);
  const [heroMediaLayer, setHeroMediaLayer] = useState<HTMLElement | null>(null);

  return (
    <HeroActionLayerContext.Provider value={heroActionLayer}>
      <HeroMediaLayerContext.Provider value={heroMediaLayer}>
        <div
          className="
            bg-gradient-mint relative flex min-h-0 w-full flex-1 flex-col
          "
          style={ambientVideo?.canvasStyle}
        >
        <section
          className={`
            mobile-hero-video
            ${showHero ? 'block' : 'hidden'}
          `}
        >
          <div ref={setHeroMediaLayer} className="mobile-hero-media">
            {hero}
          </div>
          {showHero && ambientVideo && (
            <AmbientVideoBackdrop
              filters={ambientVideo?.filters}
              temperatureOverlay={ambientVideo?.temperatureOverlay}
              tintOverlay={ambientVideo?.tintOverlay}
            />
          )}
          <div
            ref={setHeroActionLayer}
            className="
              pointer-events-none absolute inset-x-0 top-0 z-30
              h-(--mobile-hero-height)
            "
          />
        </section>
        <div
          data-mobile-hero-content-viewport={showHero ? '' : undefined}
          className={`
            relative z-30 flex min-h-0 flex-1 flex-col
            ${showHero
              ? 'mobile-hero-content-viewport overflow-hidden'
              : '-mx-4'}
          `}
        >
          <div
            data-mobile-screen-scroll
            data-mobile-hero-scroll-layer
            className={`
              flex min-h-0 flex-1 flex-col overflow-y-auto
              ${showHero ? 'bg-transparent' : 'bg-gradient-mint px-4'}
            `}
          >
            <div
              data-mobile-hero-clipped-content
              className="flex min-h-full flex-col"
            >
              {showHero && (
                <div
                  data-mobile-hero-content-spacer
                  className="mobile-hero-content-leading shrink-0"
                  aria-hidden="true"
                />
              )}
              {children}
              <div
                data-mobile-screen-bottom-spacer
                className="h-(--mobile-bottom-navigation-clearance) shrink-0"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
        </div>
      </HeroMediaLayerContext.Provider>
    </HeroActionLayerContext.Provider>
  );
};
