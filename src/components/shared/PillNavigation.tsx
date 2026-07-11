import React from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { useAlerts } from '../../hooks/useAlerts';
import { getPrimaryTabForViewerTab, PRIMARY_TAB_ITEMS } from './primaryTabs';

export const PillNavigation: React.FC = () => {
  const { activeTab, setActiveTab } = useNavigation();
  const { alerts } = useAlerts();
  const activeAlertCount = alerts.filter((a) => !a.resolved).length;
  const primaryTab = getPrimaryTabForViewerTab(activeTab);
  const activeIndex = Math.max(0, PRIMARY_TAB_ITEMS.findIndex((item) => item.tab === primaryTab));

  return (
    <nav className="pill-nav" aria-label="Primary">
      <span
        className="pill-nav-indicator"
        style={
          {
            '--pill-index': activeIndex,
          } as React.CSSProperties
        }
        aria-hidden="true"
      />
      {PRIMARY_TAB_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = primaryTab === item.tab;
        return (
          <button
            key={item.tab}
            type="button"
            onClick={() => setActiveTab(item.tab)}
            className={`
              pill-nav-item
              ${isActive ? 'pill-nav-active' : ''}
            `}
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.label}
          >
            <span className="pill-nav-icon">
              <Icon size={20} />
              {item.tab === 'home' && activeAlertCount > 0 && (
                <span className="pill-nav-badge" aria-label={`${activeAlertCount} active alerts`}>
                  {activeAlertCount}
                </span>
              )}
            </span>
            <span className="pill-nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
