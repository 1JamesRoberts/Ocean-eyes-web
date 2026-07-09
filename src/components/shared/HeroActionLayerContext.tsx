import { createContext, useContext } from 'react';

export const HeroActionLayerContext = createContext<HTMLElement | null>(null);

export const useHeroActionLayer = (): HTMLElement | null =>
  useContext(HeroActionLayerContext);
