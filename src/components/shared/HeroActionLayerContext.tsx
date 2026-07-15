import { createContext, useContext } from 'react';

export const HeroActionLayerContext = createContext<HTMLElement | null>(null);
export const HeroMediaLayerContext = createContext<HTMLElement | null>(null);

export const useHeroActionLayer = (): HTMLElement | null =>
  useContext(HeroActionLayerContext);

export const useHeroMediaLayer = (): HTMLElement | null =>
  useContext(HeroMediaLayerContext);
