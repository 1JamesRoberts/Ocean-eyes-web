import { useState, useEffect, useRef } from 'react';

export interface UseViewportSizeViewModelResult {
  imageContainerRef: React.RefObject<HTMLDivElement | null>;
  containerSize: { width: number; height: number };
  imageNaturalSize: { width: number; height: number };
  handleDimensions: (width: number, height: number) => void;
}

export const useViewportSize = (): UseViewportSizeViewModelResult => {
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 640, height: 360 });
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!imageContainerRef.current) return;
    const el = imageContainerRef.current;
    const updateSize = () => {
      setContainerSize({ width: el.offsetWidth, height: el.offsetHeight });
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleDimensions = (width: number, height: number) => {
    setImageNaturalSize({ width, height });
  };

  return {
    imageContainerRef,
    containerSize,
    imageNaturalSize,
    handleDimensions,
  };
};
