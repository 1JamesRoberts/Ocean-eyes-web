import React from "react";

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
  return (
    <div className="flex w-full flex-1 flex-col gap-4">
      <section
        className={`
          sticky top-0 z-20 -mx-4 -mt-4 h-[221px] w-[calc(100%+2rem)]
          cursor-pointer overflow-hidden bg-black
          ${showHero ? "block" : "hidden"}
        `}
      >
        {hero}
        <div
          id="viewer-hero-action-layer"
          className="pointer-events-none absolute inset-0 z-30"
        />
      </section>
      {children}
    </div>
  );
};
