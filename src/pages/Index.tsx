
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

  // Ensure consistent dark theme appearance
  useEffect(() => {
    document.body.style.backgroundColor = '#000';
    document.documentElement.style.backgroundColor = '#000';
    // Force light mode to prevent auto dark mode
    document.documentElement.classList.remove('dark');
  }, []);

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

  const handleSavePollToVote = (pollId: number) => {
    console.log(`Saving poll ${pollId} to "To Vote" list`);
    // Here you would typically save to state management or backend
  };

  const handleHidePoll = (pollId: number) => {
    console.log(`Hiding poll ${pollId}`);
    // Here you would typically update state management or backend
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'polls':
        return (
          <Polls 
            onNavigateToCreate={() => setActiveTab('create')}
            onSavePollToVote={handleSavePollToVote}
            onHidePoll={handleHidePoll}
          />
        );
      case 'create':
        return <Create />;
      case 'statistics':
        return <Statistics />;
      case 'myapp':
        return <MyApp />;
      default:
        return (
          <div className="flex-1 flex flex-col items-center justify-center px-6 relative">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-yellow-500 bg-clip-text text-transparent mb-4">
                Push It!
              </h1>
              <p className="text-gray-300 text-lg max-w-md">
                Hold the button for 3 seconds to see how many people around the world are pushing it with you
              </p>
            </div>

            <div className="relative">
              <HoldButton 
                onHoldStart={() => setIsHolding(true)}
                onHoldEnd={() => setIsHolding(false)}
                globalHolders={globalHolders}
              />

              {/* Absolute positioned counter overlay */}
              {isHolding && globalHolders > 0 && (
                <div className="absolute -top-24 left-1/2 transform -translate-x-1/2">
                  <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-8 py-6 border border-orange-500/30 whitespace-nowrap">
                    <div className="text-3xl font-bold text-orange-400 mb-2 animate-pulse text-center">
                      {globalHolders}
                    </div>
                    <div className="text-orange-200 text-sm text-center">
                      {globalHolders === 1 ? 'person is' : 'people are'} pushing with you
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-blue-900 relative overflow-hidden" style={{ backgroundColor: '#000' }}>
      <div className="relative z-10 flex flex-col h-screen">
        {renderContent()}
        
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
      
      <style>{`
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
