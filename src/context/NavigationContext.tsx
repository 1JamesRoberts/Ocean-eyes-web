// src/context/NavigationContext.tsx - Global navigation & tab state
import React, { createContext, useContext, useState } from 'react';

export type ViewerTab = 'home' | 'live' | 'settings' | 'alerts' | 'history' | 'my_fish' | 'analytics';

interface NavigationContextType {
  activeTab: ViewerTab;
  setActiveTab: (tab: ViewerTab) => void;
  selectedAlertId: string | null;
  setSelectedAlertId: (id: string | null) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ViewerTab>('home');
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  return (
    <NavigationContext.Provider
      value={{
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
