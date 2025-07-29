import { Rocket } from 'lucide-react';
import { BoostLimits } from '@/hooks/usePushSystem';

interface PushLimitIndicatorProps {
  boostLimits: BoostLimits;
}

const PushLimitIndicator = ({ boostLimits }: PushLimitIndicatorProps) => {
  const percentage = (boostLimits.boostsUsed / boostLimits.maxBoosts) * 100;
  
  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-lg p-3 border border-orange-500/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Rocket size={16} className="text-orange-400" />
          <span className="text-orange-200 text-sm font-medium">Daily Boosts</span>
        </div>
        <span className="text-orange-300 text-sm">
          {boostLimits.maxBoosts - boostLimits.boostsUsed}/{boostLimits.maxBoosts}
        </span>
      </div>
      
      <div className="bg-black/40 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-orange-400 to-yellow-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {!boostLimits.canBoost && (
        <p className="text-orange-300/70 text-xs mt-2">
          Boost limit reached. Resets at midnight.
        </p>
      )}
    </div>
  );
};

export default PushLimitIndicator;