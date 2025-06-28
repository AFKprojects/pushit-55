
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
    { id: 'myapp', icon: User, label: 'My App' },
  ];

  return (
    <div className="bg-white/10 backdrop-blur-md border-t border-white/20 px-4 py-2">
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
                  ? "bg-white/20 text-white" 
                  : "text-white/70 hover:text-white hover:bg-white/10"
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
