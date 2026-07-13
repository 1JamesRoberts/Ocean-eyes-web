import React, { useEffect, useRef, useState } from 'react';
import { HeroActionLayerContext } from './HeroActionLayerContext';

const CONTENT_FADE_HEIGHT_PX = 8;
const CONTENT_CLEARANCE_BELOW_HEADING_PX = 8;

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
  const scrollLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollLayer = scrollLayerRef.current;
    const scrollContainer = scrollLayer?.closest<HTMLElement>('.phone-content');

    if (!showHero || !scrollLayer || !scrollContainer || !heroActionLayer) return;

    let animationFrame = 0;

    const updateContentMask = () => {
      animationFrame = 0;
      const heading = heroActionLayer.querySelector('h1');
      if (!heading) return;

      const layerTop = scrollLayer.getBoundingClientRect().top;
      const headingRect = heading.getBoundingClientRect();
      const fadeOutEnd = headingRect.bottom
        + CONTENT_CLEARANCE_BELOW_HEADING_PX
        - layerTop;
      const fadeInStart = fadeOutEnd + CONTENT_FADE_HEIGHT_PX;
      const maskStart = Math.max(0, fadeOutEnd);
      const maskEnd = Math.max(
        maskStart,
        fadeInStart,
      );

      scrollLayer.style.setProperty('--mobile-hero-content-mask-start', `${maskStart}px`);
      scrollLayer.style.setProperty('--mobile-hero-content-mask-end', `${maskEnd}px`);
    };

    const scheduleContentMaskUpdate = () => {
      if (animationFrame !== 0) return;
      animationFrame = window.requestAnimationFrame(updateContentMask);
    };

    scheduleContentMaskUpdate();
    scrollContainer.addEventListener('scroll', scheduleContentMaskUpdate, { passive: true });
    window.addEventListener('resize', scheduleContentMaskUpdate);

    const headingObserver = new MutationObserver(scheduleContentMaskUpdate);
    headingObserver.observe(heroActionLayer, { childList: true, subtree: true });

    return () => {
      if (animationFrame !== 0) window.cancelAnimationFrame(animationFrame);
      headingObserver.disconnect();
      scrollContainer.removeEventListener('scroll', scheduleContentMaskUpdate);
      window.removeEventListener('resize', scheduleContentMaskUpdate);
    };
  }, [heroActionLayer, showHero]);

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
          <div
            ref={scrollLayerRef}
            data-mobile-hero-masked-content
            className={showHero
              ? 'flex flex-1 flex-col mobile-hero-content-mask'
              : 'contents'}
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
      </div>
    </HeroActionLayerContext.Provider>
  );
};
