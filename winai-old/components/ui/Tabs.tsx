
import React, { useState, createContext, useContext, ReactNode } from 'react';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export const Tabs: React.FC<{ defaultValue: string; children: ReactNode; className?: string }> = ({
  defaultValue,
  children,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};

const useTabs = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('useTabs must be used within a Tabs component');
  }
  return context;
};

export const TabsList: React.FC<{ children: ReactNode, className?: string }> = ({ children, className = '' }) => {
  return <div className={`flex items-center gap-2 p-1 rounded-lg ${className}`}>{children}</div>;
};

export const TabsTrigger: React.FC<{ value: string; children: ReactNode }> = ({ value, children }) => {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === value;

  return (
    <button
      onClick={() => setActiveTab(value)}
      className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
        isActive
          ? 'bg-emerald-100 text-emerald-700 shadow-sm'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );
};

export const TabsContent: React.FC<{ value: string; children: ReactNode }> = ({ value, children }) => {
  const { activeTab } = useTabs();
  return activeTab === value ? <div>{children}</div> : null;
};
