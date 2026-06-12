// src/context/NavigationContext.tsx - Global navigation & tab state
import React, { createContext, useContext, useState } from 'react';

export type ViewerTab = 'home' | 'live' | 'settings' | 'alerts' | 'history' | 'my_fish' | 'monitor' | 'analytics';

interface NavigationContextType {
  activeTab: ViewerTab;
  setActiveTab: (tab: ViewerTab) => void;
  selectedAlertId: string | null;
  setSelectedAlertId: (id: string | null) => void;
  autoFullscreen: boolean;
  setAutoFullscreen: (value: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ViewerTab>('home');
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [autoFullscreen, setAutoFullscreen] = useState<boolean>(false);

  return (
    <NavigationContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedAlertId,
        setSelectedAlertId,
        autoFullscreen,
        setAutoFullscreen,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
