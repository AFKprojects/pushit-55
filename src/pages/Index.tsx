
import { useState, useEffect, useRef } from 'react';
import { Users, TrendingUp, BarChart3, User } from 'lucide-react';
import HoldButton from '../components/HoldButton';
import Navigation from '../components/Navigation';
import Statistics from '../components/Statistics';
import Profile from '../components/Profile';

const Index = () => {
  const [activeTab, setActiveTab] = useState('main');
  const [globalHolders, setGlobalHolders] = useState(0);
  const [isHolding, setIsHolding] = useState(false);

  // Simulate real-time global counter updates
  useEffect(() => {
    if (isHolding) {
      const interval = setInterval(() => {
        // Simulate fluctuating number of global holders
        const baseCount = Math.floor(Math.random() * 50) + 10;
        const variation = Math.floor(Math.random() * 10) - 5;
        setGlobalHolders(Math.max(1, baseCount + variation));
      }, 500);

      return () => clearInterval(interval);
    } else {
      setGlobalHolders(0);
    }
  }, [isHolding]);

  const renderContent = () => {
    switch (activeTab) {
      case 'statistics':
        return <Statistics />;
      case 'profile':
        return <Profile />;
      default:
        return (
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-blue to-soft-purple bg-clip-text text-transparent mb-4">
                Hold Together
              </h1>
              <p className="text-dark-gray dark:text-light-gray text-lg max-w-md">
                Hold the button for 3 seconds to see how many people around the world are holding with you
              </p>
            </div>

            <HoldButton 
              onHoldStart={() => setIsHolding(true)}
              onHoldEnd={() => setIsHolding(false)}
              globalHolders={globalHolders}
            />

            {isHolding && globalHolders > 0 && (
              <div className="mt-8 text-center animate-fade-in">
                <div className="bg-sky-blue/20 backdrop-blur-sm rounded-2xl px-8 py-6 border border-sky-blue/30 animate-pulse-gentle">
                  <div className="text-3xl font-bold text-dark-gray dark:text-white mb-2">
                    {globalHolders}
                  </div>
                  <div className="text-dark-gray/70 dark:text-white/80 text-sm">
                    {globalHolders === 1 ? 'person is' : 'people are'} holding with you
                  </div>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-blue via-soft-purple to-sky-blue relative overflow-hidden">
      <div className="relative z-10 flex flex-col h-screen">
        {renderContent()}
        
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
};

export default Index;
