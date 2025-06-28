
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface HoldButtonProps {
  onHoldStart: () => void;
  onHoldEnd: () => void;
  globalHolders: number;
}

const HoldButton = ({ onHoldStart, onHoldEnd, globalHolders }: HoldButtonProps) => {
  const [isPressed, setIsPressed] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isActivated, setIsActivated] = useState(false);
  const holdTimeoutRef = useRef<NodeJS.Timeout>();
  const progressIntervalRef = useRef<NodeJS.Timeout>();
  const startTimeRef = useRef<number>();

  const startHold = () => {
    setIsPressed(true);
    setHoldProgress(0);
    startTimeRef.current = Date.now();

    // Progress animation
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current!;
      const progress = Math.min(elapsed / 3000, 1);
      setHoldProgress(progress);
    }, 16);

    // Activation after 3 seconds
    holdTimeoutRef.current = setTimeout(() => {
      setIsActivated(true);
      onHoldStart();
    }, 3000);
  };

  const endHold = () => {
    setIsPressed(false);
    setHoldProgress(0);
    setIsActivated(false);
    onHoldEnd();

    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const getButtonColor = () => {
    if (isActivated) return 'from-green-400 to-emerald-500';
    if (isPressed) return 'from-yellow-400 to-orange-500';
    return 'from-blue-500 to-purple-600';
  };

  const getButtonScale = () => {
    if (isActivated) return 'scale-110';
    if (isPressed) return 'scale-105';
    return 'scale-100 hover:scale-105';
  };

  return (
    <div className="relative">
      {/* Outer glow effect */}
      {isActivated && (
        <div className="absolute inset-0 rounded-full bg-green-400/30 animate-ping scale-150" />
      )}
      
      {/* Progress ring */}
      {isPressed && !isActivated && (
        <svg 
          className="absolute inset-0 w-full h-full -rotate-90 scale-110"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeOpacity="0.3"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - holdProgress)}`}
            className="transition-all duration-75 ease-out"
          />
        </svg>
      )}

      {/* Main button */}
      <button
        className={cn(
          "relative w-48 h-48 rounded-full transition-all duration-200 ease-out",
          "bg-gradient-to-br shadow-2xl",
          "active:shadow-lg select-none touch-none",
          "flex items-center justify-center",
          getButtonColor(),
          getButtonScale()
        )}
        onMouseDown={startHold}
        onMouseUp={endHold}
        onMouseLeave={endHold}
        onTouchStart={startHold}
        onTouchEnd={endHold}
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        <div className="text-white text-center">
          {isActivated ? (
            <div className="animate-fade-in">
              <div className="text-2xl font-bold mb-1">LIVE</div>
              <div className="text-sm opacity-80">Hold to connect</div>
            </div>
          ) : isPressed ? (
            <div className="animate-scale-in">
              <div className="text-xl font-bold mb-1">
                {Math.ceil(3 - (holdProgress * 3))}
              </div>
              <div className="text-sm opacity-80">Keep holding...</div>
            </div>
          ) : (
            <div>
              <div className="text-xl font-bold mb-1">HOLD</div>
              <div className="text-sm opacity-80">Press & hold for 3s</div>
            </div>
          )}
        </div>

        {/* Inner highlight */}
        <div className="absolute inset-2 rounded-full bg-white/10" />
      </button>
    </div>
  );
};

export default HoldButton;
