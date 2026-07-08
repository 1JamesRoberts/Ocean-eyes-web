import React from 'react';
import { Home, Fish, BarChart3, User } from 'lucide-react';
import { useNavigation, type ViewerTab } from '../../context/NavigationContext';
import { useAlerts } from '../../hooks/useAlerts';

interface PillNavItem {
  tab: ViewerTab;
  icon: React.ElementType;
  label: string;
}

const PILL_ITEMS: PillNavItem[] = [
  { tab: 'home', icon: Home, label: 'Dashboard' },
  { tab: 'my_fish', icon: Fish, label: 'My Fish' },
  { tab: 'analytics', icon: BarChart3, label: 'Analytics' },
  { tab: 'live', icon: User, label: 'Account' },
];

export const PillNavigation: React.FC = () => {
  const { activeTab, setActiveTab } = useNavigation();
  const { alerts } = useAlerts();
  const activeAlertCount = alerts.filter((a) => !a.resolved).length;

  return (
    <nav className="pill-nav" aria-label="Primary">
      {PILL_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.tab || (item.tab === 'live' && activeTab === 'settings');
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
