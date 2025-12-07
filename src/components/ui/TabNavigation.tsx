// =============================================================================
// TAB NAVIGATION — Reusable horizontal tab menu
// =============================================================================
// Clean, minimalist navigation for Projects, Groups, and other views
// Inspired by Notion/Linear style navigation
// =============================================================================

import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: number | string;  // Optional badge count (e.g., "0", "3", "New")
}

interface TabNavigationProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = '',
}) => {
  return (
    <div className={`border-b border-[#2A2A2A] ${className}`}>
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap
                border-b-2 -mb-[1px]
                ${
                  isActive
                    ? 'border-[#4433FF] text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-700'
                }
              `}
            >
              {Icon && <Icon size={16} />}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`
                    px-1.5 py-0.5 text-[10px] font-bold rounded
                    ${
                      isActive
                        ? 'bg-[#4433FF]/20 text-[#4433FF]'
                        : 'bg-[#1A1A1D] text-gray-600'
                    }
                  `}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
