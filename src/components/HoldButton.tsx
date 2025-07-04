
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
    if (isActivated) return 'from-orange-400 to-yellow-500';
    if (isPressed) return 'from-orange-500 to-red-600';
    return 'from-orange-500 to-yellow-600';
  };

  const getButtonScale = () => {
    if (isActivated) return 'scale-110';
    if (isPressed) return 'scale-105';
    return 'scale-100 hover:scale-105';
  };

  return (
    <div className="relative">
      {/* Outer glow effect with heartbeat animation */}
      {isActivated && (
        <div className="absolute inset-0 rounded-full bg-orange-400/30 animate-pulse scale-150" 
             style={{ 
               animation: 'heartbeat 1.2s ease-in-out infinite',
               animationDelay: '0s'
             }} />
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
            stroke="orange"
            strokeWidth="2"
            strokeOpacity="0.3"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="orange"
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
          "shadow-2xl active:shadow-lg select-none touch-none",
          "flex items-center justify-center",
          getButtonScale()
        )}
        onMouseDown={startHold}
        onMouseUp={endHold}
        onMouseLeave={endHold}
        onTouchStart={startHold}
        onTouchEnd={endHold}
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        {/* Blue outer ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 shadow-2xl"></div>
        
        {/* Orange inner circle */}
        <div className="absolute inset-3 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg"></div>
        
        {/* Inner shadow for depth */}
        <div className="absolute inset-6 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 shadow-inner"></div>

        <div className="relative z-10 text-blue-900 text-center font-bold">
          {isActivated ? (
            <div className="animate-fade-in">
              <div className="text-lg leading-tight">PUSH</div>
              <div className="text-lg leading-tight">IT!</div>
              <div className="text-xs mt-1 opacity-80">LIVE</div>
            </div>
          ) : isPressed ? (
            <div className="animate-scale-in">
              <div className="text-lg leading-tight">PUSH</div>
              <div className="text-lg leading-tight">IT!</div>
              <div className="text-sm mt-1">
                {Math.ceil(3 - (holdProgress * 3))}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-lg leading-tight">PUSH</div>
              <div className="text-lg leading-tight">IT!</div>
            </div>
          )}
        </div>
      </button>
    </div>
  );
};

export default HoldButton;
