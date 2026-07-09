import { BarChart3, Fish, Home, User } from 'lucide-react';
import type React from 'react';
import type { ViewerTab } from '../../context/NavigationContext';

export interface PrimaryTabItem {
  tab: ViewerTab;
  icon: React.ElementType;
  label: string;
}

export const PRIMARY_TAB_ITEMS: PrimaryTabItem[] = [
  { tab: 'home', icon: Home, label: 'Dashboard' },
  { tab: 'my_fish', icon: Fish, label: 'My Fish' },
  { tab: 'analytics', icon: BarChart3, label: 'Analytics' },
  { tab: 'live', icon: User, label: 'Account' },
];

const SECONDARY_TAB_PARENT: Partial<Record<ViewerTab, ViewerTab>> = {
  alerts: 'home',
  history: 'home',
  settings: 'live',
};

export const getPrimaryTabForViewerTab = (tab: ViewerTab): ViewerTab => {
  return SECONDARY_TAB_PARENT[tab] ?? tab;
};
