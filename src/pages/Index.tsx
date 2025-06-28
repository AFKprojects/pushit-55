
import { useState, useEffect } from 'react';
import HoldButton from '../components/HoldButton';
import Navigation from '../components/Navigation';
import Statistics from '../components/Statistics';
import Polls from '../components/Polls';
import Create from '../components/Create';
import MyApp from '../components/MyApp';

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
      case 'polls':
        return <Polls onNavigateToCreate={() => setActiveTab('create')} />;
      case 'create':
        return <Create />;
      case 'statistics':
        return <Statistics />;
      case 'myapp':
        return <MyApp />;
      default:
        return (
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-yellow-500 bg-clip-text text-transparent mb-4">
                HIVE
              </h1>
              <p className="text-gray-300 text-lg max-w-md">
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
                <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-8 py-6 border border-orange-500/30">
                  <div className="text-3xl font-bold text-orange-400 mb-2 animate-pulse">
                    {globalHolders}
                  </div>
                  <div className="text-orange-200 text-sm">
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
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-orange-900 relative overflow-hidden">
      <div className="relative z-10 flex flex-col h-screen">
        {renderContent()}
        
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
      
      <style jsx>{`
        @keyframes heartbeat {
          0%, 100% { 
            transform: scale(1.5); 
            opacity: 0.3; 
          }
          50% { 
            transform: scale(1.7); 
            opacity: 0.1; 
          }
        }
      `}</style>
    </div>
  );
};

export default Index;
