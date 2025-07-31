import { useState, useEffect } from 'react';
import HoldButton from '../components/HoldButton';
import Navigation from '../components/Navigation';
import Statistics from '../components/Statistics';
import Polls from '../components/Polls';
import Create from '../components/Create';
import MyApp from '../components/MyApp';
import Onboarding from '../components/Onboarding';
import { useAuth } from '../hooks/useAuth';
import { useSessionManager } from '../hooks/useSessionManager';
import { Button } from '@/components/ui/button';
import { LogIn, HelpCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import PollModal from '@/components/PollModal';
import UserModal from '@/components/UserModal';
import { usePollModal } from '@/hooks/usePollModal';

const Index = () => {
  const [activeTab, setActiveTab] = useState('main');
  const [isButtonActivated, setIsButtonActivated] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user } = useAuth();
  const { activeSessionCount, startSession, endSession } = useSessionManager();
  const navigate = useNavigate();
  const params = useParams();
  const { openModal } = usePollModal();

  // Check if user has seen onboarding
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  // Ensure consistent dark theme appearance
  useEffect(() => {
    document.body.style.backgroundColor = '#000';
    document.documentElement.style.backgroundColor = '#000';
    // Force light mode to prevent auto dark mode
    document.documentElement.classList.remove('dark');
  }, []);

  // Handle direct poll URL access
  useEffect(() => {
    const path = window.location.pathname;
    const pollMatch = path.match(/^\/poll\/([^\/]+)$/);
    if (pollMatch) {
      const pollId = pollMatch[1];
      openModal(pollId);
    }
  }, [openModal]);

  const handleHoldStart = () => {
    if (user) {
      startSession();
    }
  };

  const handleHoldEnd = () => {
    if (user) {
      endSession();
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    localStorage.setItem('hasSeenOnboarding', 'true');
  };

  const startOnboarding = () => {
    setActiveTab('main');
    setShowOnboarding(true);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'polls':
        return (
          <div className="flex-1 overflow-y-auto pb-24">
            <Polls 
              onNavigateToCreate={() => setActiveTab('create')}
            />
          </div>
        );
      case 'create':
        return (
          <div className="flex-1 overflow-y-auto pb-24">
            <Create />
          </div>
        );
      case 'statistics':
        return (
          <div className="flex-1 overflow-y-auto pb-24">
            <Statistics />
          </div>
        );
      case 'myapp':
        return (
          <div className="flex-1 overflow-y-auto pb-24">
            <MyApp />
          </div>
        );
      default:
        return (
          <div className="flex-1 flex flex-col items-center justify-center px-6 relative">
            <div className="absolute top-6 right-6 flex gap-3">
              <Button
                onClick={startOnboarding}
                variant="outline"
                className="border-blue-500/30 text-blue-300 hover:text-white hover:bg-blue-500/20"
              >
                <HelpCircle size={18} className="mr-2" />
                Pomoc
              </Button>
              {!user && (
                <Button
                  data-onboarding="login-button"
                  onClick={() => navigate('/auth')}
                  className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-medium"
                >
                  <LogIn size={18} className="mr-2" />
                  Login
                </Button>
              )}
            </div>

            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-yellow-500 bg-clip-text text-transparent mb-4">
                Push It!
              </h1>
              <p className="text-gray-300 text-lg max-w-md">
                {user 
                  ? "Hold the button for 3 seconds to see how many people worldwide are doing the same as you"
                  : "Log in to join the global Push It! community"
                }
              </p>
            </div>

            <div className="relative" data-onboarding="main-button">
              <HoldButton 
                onHoldStart={handleHoldStart}
                onHoldEnd={handleHoldEnd}
                globalHolders={activeSessionCount}
                onActivationChange={setIsButtonActivated}
              />

              {/* Absolute positioned counter overlay */}
              {isButtonActivated && (
                <div className="absolute -top-24 left-1/2 transform -translate-x-1/2">
                  <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-8 py-6 border border-orange-500/30 whitespace-nowrap">
                    {user ? (
                      // Logged in user - show count
                      <>
                        <div className="text-3xl font-bold text-orange-400 mb-2 animate-pulse text-center">
                          {activeSessionCount}
                        </div>
                        <div className="text-orange-200 text-sm text-center">
                          {activeSessionCount === 1 ? 'person is holding' : 'people are holding'} the button right now
                        </div>
                      </>
                    ) : (
                      // Not logged in - show login message
                      <div className="text-orange-200 text-sm text-center">
                        Log in to see how many people are holding the button with you
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-blue-900 relative" style={{ backgroundColor: '#000' }}>
      <div className="flex flex-col h-screen">
        {renderContent()}
        
        <Navigation 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          data-onboarding="navigation"
        />
        <PollModal />
        <UserModal />
        <Onboarding
          isVisible={showOnboarding}
          onComplete={handleOnboardingComplete}
          onTabChange={setActiveTab}
          activeTab={activeTab}
        />
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
