
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

  const getButtonScale = () => {
    if (isActivated) return 'scale-110 transition-transform duration-200';
    if (isPressed) return 'scale-105 transition-transform duration-200';
    return 'scale-100 hover:scale-105 transition-transform duration-200';
  };

  return (
    <div className="relative">
      {/* Countdown timer above button */}
      {isPressed && !isActivated && (
        <div className="absolute -top-20 left-1/2 transform -translate-x-1/2">
          <div className="bg-gradient-to-r from-orange-500 to-blue-600 rounded-2xl px-6 py-3 border border-orange-400/30 shadow-xl animate-fade-in">
            <div className="text-2xl font-bold text-white text-center">
              {Math.ceil(3 - (holdProgress * 3))}
            </div>
          </div>
        </div>
      )}

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
          "relative w-48 h-48 rounded-full",
          "shadow-2xl active:shadow-lg select-none touch-none",
          "flex items-center justify-center overflow-hidden",
          getButtonScale()
        )}
        onMouseDown={startHold}
        onMouseUp={endHold}
        onMouseLeave={endHold}
        onTouchStart={startHold}
        onTouchEnd={endHold}
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        {/* Background image */}
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center"
          style={{ backgroundImage: 'url(/lovable-uploads/81adbfc0-1db2-4230-83fa-d910ce5070f9.png)' }}
        ></div>

        <div className="relative z-10 text-white text-center font-bold">
          {isActivated && (
            <div className="animate-fade-in">
              <div className="text-xs opacity-80">LIVE</div>
            </div>
          )}
        </div>
      </button>
    </div>
  );
};

export default HoldButton;
