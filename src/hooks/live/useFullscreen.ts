import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseFullscreenViewModelResult {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  isFullscreen: boolean;
  showFsInventory: boolean;
  setShowFsInventory: (value: boolean) => void;
  toggleFullscreen: () => void;
}

export const useFullscreen = (): UseFullscreenViewModelResult => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFsInventory, setShowFsInventory] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (!isFs) {
        setShowFsInventory(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!viewportRef.current) return;
    if (!document.fullscreenElement) {
      viewportRef.current.requestFullscreen().catch((err: Error) => {
        console.error(`Error entering fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  return {
    viewportRef,
    isFullscreen,
    showFsInventory,
    setShowFsInventory,
    toggleFullscreen,
  };
};
