import { useState, useEffect, useRef, useCallback } from 'react';
import type { ViewerTab } from '../../context/NavigationContext';

interface UseFullscreenViewModelOptions {
  autoFullscreen: boolean;
  setAutoFullscreen: (value: boolean) => void;
  setActiveTab: (tab: ViewerTab) => void;
}

export interface UseFullscreenViewModelResult {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  isFullscreen: boolean;
  showFsInventory: boolean;
  setShowFsInventory: (value: boolean) => void;
  toggleFullscreen: () => void;
}

export const useFullscreenViewModel = ({
  autoFullscreen,
  setAutoFullscreen,
  setActiveTab,
}: UseFullscreenViewModelOptions): UseFullscreenViewModelResult => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFsInventory, setShowFsInventory] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const enteredViaAutoFullscreenRef = useRef(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (!isFs) {
        setShowFsInventory(false);
        if (enteredViaAutoFullscreenRef.current) {
          enteredViaAutoFullscreenRef.current = false;
          setActiveTab('home');
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [setActiveTab]);

  useEffect(() => {
    if (autoFullscreen && viewportRef.current) {
      enteredViaAutoFullscreenRef.current = true;
      viewportRef.current.requestFullscreen().catch((err: Error) => {
        console.error(`Error entering fullscreen: ${err.message}`);
      });
      setAutoFullscreen(false);
    }
  }, [autoFullscreen, setAutoFullscreen]);

  const toggleFullscreen = useCallback(() => {
    if (!viewportRef.current) return;
    if (!document.fullscreenElement) {
      enteredViaAutoFullscreenRef.current = false;
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
