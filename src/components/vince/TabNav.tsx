import React from 'react';
import { FiEdit3, FiFolder } from 'react-icons/fi';

export type VinceTab = 'editor' | 'library';

interface TabNavProps {
  activeTab: VinceTab;
  onTabChange: (tab: VinceTab) => void;
  libraryCount?: number;
}

/**
 * Tab navigation component for VINCE (Editor | Library)
 */
const TabNav: React.FC<TabNavProps> = ({ activeTab, onTabChange, libraryCount }) => {
  const tabs: { key: VinceTab; label: string; icon: React.ReactNode }[] = [
    { key: 'editor', label: 'Editor', icon: <FiEdit3 size={18} /> },
    { key: 'library', label: 'Library', icon: <FiFolder size={18} /> },
  ];

  return (
    <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors relative
            ${
              activeTab === tab.key
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400 -mb-[1px]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }
          `}
        >
          {tab.icon}
          <span>{tab.label}</span>
          {tab.key === 'library' && libraryCount !== undefined && libraryCount > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              {libraryCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default TabNav;
