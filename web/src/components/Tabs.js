'use client';

import { useState } from 'react';

export default function Tabs({ tabs, defaultTab = 0, activeTab: controlledActiveTab, onTabChange, children }) {
  const [internalActiveTab, setInternalActiveTab] = useState(defaultTab);
  
  // Support both controlled and uncontrolled modes
  const isControlled = controlledActiveTab !== undefined && onTabChange !== undefined;
  const activeTabValue = isControlled ? controlledActiveTab : internalActiveTab;
  
  const handleTabClick = (tabIdOrIndex) => {
    if (isControlled) {
      onTabChange(tabIdOrIndex);
    } else {
      setInternalActiveTab(tabIdOrIndex);
    }
  };

  // Ensure children is an array
  const childrenArray = children ? (Array.isArray(children) ? children : [children]) : [];

  // Check if tabs have id property (controlled mode with string IDs)
  const hasTabIds = tabs.length > 0 && tabs[0].id !== undefined;

  return (
    <div className="w-full">
      {/* Tab Headers */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab, index) => {
            const tabKey = hasTabIds ? tab.id : index;
            const isActive = hasTabIds ? activeTabValue === tab.id : activeTabValue === index;
            
            return (
              <button
                key={tabKey}
                onClick={() => handleTabClick(tabKey)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    isActive
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content - Only render if children are provided */}
      {childrenArray.length > 0 && (
        <div className="mt-6">
          {hasTabIds 
            ? childrenArray.find((_, idx) => tabs[idx]?.id === activeTabValue)
            : childrenArray[activeTabValue]
          }
        </div>
      )}
    </div>
  );
}
