import React from 'react';
import { Button } from '@/components/ui/button';
import { useVoteHoldManager } from '@/hooks/useVoteHoldManager';
import { cn } from '@/lib/utils';

interface VoteHoldButtonProps {
  pollId: string;
  optionId: string;
  optionText: string;
  percentage: number;
  isSelected: boolean;
  isDisabled?: boolean;
  onVoteComplete?: () => void;
}

export const VoteHoldButton: React.FC<VoteHoldButtonProps> = ({
  pollId,
  optionId,
  optionText,
  percentage,
  isSelected,
  isDisabled = false,
  onVoteComplete
}) => {
  const { startVoteHold, endVoteHold, isHolding, countdown, activeHoldCount, currentSession } = useVoteHoldManager();
  
  const isThisOptionBeingHeld = currentSession?.optionId === optionId;
  const showCountdown = isThisOptionBeingHeld && countdown > 0;
  const showActiveCount = isThisOptionBeingHeld && countdown === 0;

  const handleMouseDown = async () => {
    if (isDisabled || isHolding) return;
    await startVoteHold(pollId, optionId);
  };

  const handleMouseUp = async () => {
    if (isThisOptionBeingHeld) {
      await endVoteHold(countdown === 0);
      if (countdown === 0 && onVoteComplete) {
        onVoteComplete();
      }
    }
  };

  const handleMouseLeave = async () => {
    if (isThisOptionBeingHeld) {
      await endVoteHold(false); // Don't record vote if mouse leaves
    }
  };

  return (
    <div className="relative w-full">
      <Button
        variant="outline"
        size="default"
        className={cn(
          "w-full h-auto min-h-[60px] p-4 flex flex-col items-start justify-between border-2 transition-all duration-200",
          "hover:bg-accent/50 active:scale-95",
          isSelected && "border-primary bg-primary/10",
          isThisOptionBeingHeld && "border-primary bg-primary/20 shadow-lg",
          isDisabled && "opacity-50 cursor-not-allowed"
        )}
        disabled={isDisabled}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
      >
        <div className="w-full flex flex-col gap-2">
          <div className="flex justify-between items-center w-full">
            <span className="text-left font-medium text-foreground">
              {optionText}
            </span>
            <span className="text-sm text-muted-foreground font-semibold">
              {percentage}%
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Hold feedback */}
          {showCountdown && (
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {countdown}
              </div>
              <div className="text-sm text-muted-foreground">
                Hold to vote...
              </div>
            </div>
          )}

          {showActiveCount && (
            <div className="text-center">
              <div className="text-xl font-bold text-primary">
                {activeHoldCount}
              </div>
              <div className="text-sm text-muted-foreground">
                people holding
              </div>
            </div>
          )}
        </div>
      </Button>
    </div>
  );
};