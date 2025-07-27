import { Flame, TrendingUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

type SortMode = 'new' | 'popular' | 'hot';

interface SortingTabsProps {
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
}

const SortingTabs = ({ sortMode, onSortChange }: SortingTabsProps) => {
  const tabs = [
    {
      key: 'hot' as SortMode,
      label: 'Hot',
      icon: Flame,
      description: 'Trending topics'
    },
    {
      key: 'popular' as SortMode,
      label: 'Popular',
      icon: TrendingUp,
      description: 'Most votes'
    },
    {
      key: 'new' as SortMode,
      label: 'New',
      icon: Clock,
      description: 'Latest polls'
    }
  ];

  return (
    <div className="flex gap-2 p-1 bg-black/20 rounded-lg border border-orange-500/20">
      {tabs.map(({ key, label, icon: Icon, description }) => {
        const isActive = sortMode === key;
        return (
          <Button
            key={key}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            onClick={() => onSortChange(key)}
            className={`flex-1 gap-2 ${
              isActive 
                ? "bg-orange-500 text-white hover:bg-orange-600" 
                : "text-orange-300 hover:bg-orange-500/10"
            }`}
            title={description}
          >
            <Icon size={16} />
            <span className="font-medium">{label}</span>
          </Button>
        );
      })}
    </div>
  );
};

export default SortingTabs;