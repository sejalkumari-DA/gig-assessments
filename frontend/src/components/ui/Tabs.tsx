import React, { createContext, useContext, useState } from 'react';

const TabsContext = createContext<{ activeTab: string; setActiveTab: (value: string) => void } | null>(null);

export function Tabs({ defaultValue, children, className = '' }: { defaultValue: string, children: React.ReactNode, className?: string }) {
  const [activeTab, setActiveTab] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`w-full justify-start h-auto bg-transparent border-b border-border rounded-none p-0 overflow-x-auto flex flex-nowrap scrollbar-hide ${className}`}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children, className = '' }: { value: string, children: React.ReactNode, className?: string }) {
  const ctx = useContext(TabsContext);
  if (!ctx) return null;
  const isActive = ctx.activeTab === value;

  return (
    <button
      onClick={() => ctx.setActiveTab(value)}
      data-state={isActive ? "active" : "inactive"}
      className={`flex-shrink-0 rounded-none border-b-2 transition-colors px-4 py-2 text-sm font-medium
        ${isActive ? 'border-primary text-primary bg-transparent shadow-none' : 'border-transparent text-muted-foreground hover:text-foreground'}
        ${className}`}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className = '' }: { value: string, children: React.ReactNode, className?: string }) {
  const ctx = useContext(TabsContext);
  if (!ctx || ctx.activeTab !== value) return null;
  return <div className={`pt-4 animate-in fade-in duration-200 ${className}`}>{children}</div>;
}
