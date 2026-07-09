import React from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { getPrimaryTabForViewerTab, PRIMARY_TAB_ITEMS } from './primaryTabs';

interface TabPageDotsProps {
  className?: string;
}

export const TabPageDots: React.FC<TabPageDotsProps> = ({ className = '' }) => {
  const { activeTab } = useNavigation();
  const primaryTab = getPrimaryTabForViewerTab(activeTab);

  return (
    <div
      className={`flex h-2 items-center justify-center gap-1 ${className}`}
      aria-hidden="true"
    >
      {PRIMARY_TAB_ITEMS.map((item) => {
        const isActive = item.tab === primaryTab;

        return (
          <span
            key={item.tab}
            className={`
              block rounded-full transition-[width,background-color,opacity,box-shadow] duration-300 ease-out
              ${isActive
                ? 'h-1.5 w-5 bg-brand-bright/25 opacity-75'
                : 'h-1.5 w-1.5 bg-brand-bright/25 opacity-75'
              }
            `}
          />
        );
      })}
    </div>
  );
};
