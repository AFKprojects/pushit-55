

import { BarChart3, Users, Plus, TrendingUp, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Navigation = ({ activeTab, onTabChange }: NavigationProps) => {
  const tabs = [
    { id: 'main', icon: Users, label: 'Main' },
    { id: 'polls', icon: TrendingUp, label: 'Vote' },
    { id: 'create', icon: Plus, label: 'Create' },
    { id: 'statistics', icon: BarChart3, label: 'Stats' },
    { id: 'myapp', icon: User, label: 'My App' },
  ];

  return (
    <div className="bg-black/30 backdrop-blur-md border-t border-blue-500/20 px-4 py-2">
      <div className="flex justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200",
                "min-w-[60px]",
                isActive 
                  ? "bg-blue-500/20 text-blue-400" 
                  : "text-blue-200/70 hover:text-blue-200 hover:bg-blue-500/10"
              )}
            >
              <Icon size={20} className="mb-1" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Navigation;

