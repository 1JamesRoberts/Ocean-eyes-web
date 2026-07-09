import React, { useLayoutEffect, useRef, useState } from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { useAlerts } from '../../hooks/useAlerts';
import { getPrimaryTabForViewerTab, PRIMARY_TAB_ITEMS } from './primaryTabs';

export const PillNavigation: React.FC = () => {
  const { activeTab, setActiveTab } = useNavigation();
  const { alerts } = useAlerts();
  const activeAlertCount = alerts.filter((a) => !a.resolved).length;

  const navRef = useRef<HTMLElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const measure = () => {
      const nav = navRef.current;
      const primaryTab = getPrimaryTabForViewerTab(activeTab);
      const activeEntry = PRIMARY_TAB_ITEMS.find((item) => primaryTab === item.tab);
      const btn = activeEntry ? buttonRefs.current[activeEntry.tab] : null;
      if (!nav || !btn) return;
      const navRect = nav.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      setIndicator({
        left: btnRect.left - navRect.left,
        width: btnRect.width,
      });
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [activeTab]);

  return (
    <nav className="pill-nav" aria-label="Primary" ref={navRef}>
      <span
        className="pill-nav-indicator"
        style={
          {
            '--pill-indicator-x': `${indicator.left}px`,
            '--pill-indicator-w': `${indicator.width}px`,
          } as React.CSSProperties
        }
        aria-hidden="true"
      />
      {PRIMARY_TAB_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = getPrimaryTabForViewerTab(activeTab) === item.tab;
        return (
          <button
            key={item.tab}
            ref={(el) => {
              buttonRefs.current[item.tab] = el;
            }}
            type="button"
            onClick={() => setActiveTab(item.tab)}
            className={`
              pill-nav-item
              ${isActive ? 'pill-nav-active' : ''}
            `}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="pill-nav-icon">
              <Icon size={20} />
              {item.tab === 'live' && activeAlertCount > 0 && (
                <span className="pill-nav-badge">{activeAlertCount}</span>
              )}
            </span>
            <span className="pill-nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
