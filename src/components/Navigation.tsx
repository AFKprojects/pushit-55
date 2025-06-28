
import { BarChart3, Users, Plus, TrendingUp, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Navigation = ({ activeTab, onTabChange }: NavigationProps) => {
  const tabs = [
    { id: 'main', icon: Users, label: 'Main' },
    { id: 'polls', icon: TrendingUp, label: 'Polls' },
    { id: 'create', icon: Plus, label: 'Create' },
    { id: 'statistics', icon: BarChart3, label: 'Stats' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="bg-light-gray/90 dark:bg-dark-gray/90 backdrop-blur-md border-t border-indigo-blue/20 px-4 py-2">
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
                  ? "bg-indigo-blue/20 text-indigo-blue dark:text-sky-blue" 
                  : "text-dark-gray/70 dark:text-light-gray/70 hover:text-indigo-blue dark:hover:text-sky-blue hover:bg-indigo-blue/10"
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
