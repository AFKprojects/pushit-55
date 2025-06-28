
import { useState } from 'react';
import { Users, BarChart3, User, Eye, Vote, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const MyApp = () => {
  const [activeSection, setActiveSection] = useState('community');

  const sections = [
    { id: 'community', label: 'Community', icon: Users },
    { id: 'polls', label: 'My Polls', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const renderCommunity = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Your Community</h2>
        <p className="text-white/70">See your impact and connections</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 text-center">
          <Eye size={24} className="text-blue-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">127</div>
          <div className="text-white/60 text-sm">Observers</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 text-center">
          <Vote size={24} className="text-purple-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">342</div>
          <div className="text-white/60 text-sm">Poll Votes</div>
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
        <h3 className="text-white font-medium mb-3 flex items-center gap-2">
          <TrendingUp size={20} className="text-green-400" />
          Recent Activity
        </h3>
        <div className="space-y-2 text-white/70 text-sm">
          <p>• 12 new observers this week</p>
          <p>• Your poll got 67 new votes</p>
          <p>• 3 people commented on your polls</p>
        </div>
      </div>
    </div>
  );

  const renderMyPolls = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">My Polls</h2>
        <p className="text-white/70">Track your poll performance</p>
      </div>

      <div className="space-y-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <h3 className="text-white font-medium mb-2">Best time to hold?</h3>
          <div className="flex justify-between items-center mb-2">
            <span className="text-white/70 text-sm">Total votes: 89</span>
            <span className="text-green-400 text-sm">Active</span>
          </div>
          <div className="bg-white/10 rounded-full h-2">
            <div className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full w-3/4" />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <h3 className="text-white font-medium mb-2">Favorite hold duration?</h3>
          <div className="flex justify-between items-center mb-2">
            <span className="text-white/70 text-sm">Total votes: 156</span>
            <span className="text-yellow-400 text-sm">2 days left</span>
          </div>
          <div className="bg-white/10 rounded-full h-2">
            <div className="bg-gradient-to-r from-green-400 to-blue-400 h-2 rounded-full w-full" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <User size={40} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-white">Your Profile</h2>
        <p className="text-white/70">@holdmaster2024</p>
      </div>

      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
        <h3 className="text-white font-medium mb-3">Stats Overview</h3>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-white">15</div>
            <div className="text-white/60 text-sm">Polls Created</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">89</div>
            <div className="text-white/60 text-sm">Days Active</div>
          </div>
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
        <h3 className="text-white font-medium mb-3">Achievements</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
              🏆
            </div>
            <span className="text-white text-sm">Poll Master - Created 10+ polls</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              🔥
            </div>
            <span className="text-white text-sm">Streak Keeper - 30 day streak</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'community':
        return renderCommunity();
      case 'polls':
        return renderMyPolls();
      case 'profile':
        return renderProfile();
      default:
        return renderCommunity();
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Section Navigation */}
      <div className="px-6 py-4">
        <div className="flex bg-white/10 backdrop-blur-sm rounded-2xl p-1 border border-white/20">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl transition-all duration-200",
                  isActive 
                    ? "bg-white/20 text-white" 
                    : "text-white/70 hover:text-white hover:bg-white/10"
                )}
              >
                <Icon size={16} />
                <span className="text-sm font-medium">{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-6 overflow-y-auto">
        <div className="max-w-md mx-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default MyApp;
