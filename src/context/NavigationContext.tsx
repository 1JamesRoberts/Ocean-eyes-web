// src/context/NavigationContext.tsx - Global navigation & tab state
import React, { createContext, useContext, useState } from 'react';

export type AppMode = 'viewer' | 'monitor' | 'both';
export type ViewerTab = 'home' | 'live' | 'settings' | 'alerts' | 'history' | 'my_fish' | 'monitor';

interface NavigationContextType {
  activeMode: AppMode;
  setActiveMode: (mode: AppMode) => void;
  activeTab: ViewerTab;
  setActiveTab: (tab: ViewerTab) => void;
  selectedAlertId: string | null;
  setSelectedAlertId: (id: string | null) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeMode, setActiveMode] = useState<AppMode>('both');
  const [activeTab, setActiveTab] = useState<ViewerTab>('home');
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  return (
    <NavigationContext.Provider
      value={{
        activeMode,
        setActiveMode,
        activeTab,
        setActiveTab,
        selectedAlertId,
        setSelectedAlertId,
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
