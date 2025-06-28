
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
        <h2 className="text-2xl font-bold text-orange-400 mb-2">Your Community</h2>
        <p className="text-orange-200/70">See your impact and connections</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-orange-500/20 text-center">
          <Eye size={24} className="text-orange-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-orange-400">127</div>
          <div className="text-orange-300/60 text-sm">Observers</div>
        </div>
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-orange-500/20 text-center">
          <Vote size={24} className="text-yellow-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-orange-400">342</div>
          <div className="text-orange-300/60 text-sm">Poll Votes</div>
        </div>
      </div>

      <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-orange-500/20">
        <h3 className="text-orange-200 font-medium mb-3 flex items-center gap-2">
          <TrendingUp size={20} className="text-orange-400" />
          Recent Activity
        </h3>
        <div className="space-y-2 text-orange-300/70 text-sm">
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
        <h2 className="text-2xl font-bold text-orange-400 mb-2">My Polls</h2>
        <p className="text-orange-200/70">Track your poll performance</p>
      </div>

      <div className="space-y-4">
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-orange-500/20">
          <h3 className="text-orange-200 font-medium mb-2">Best time to hold?</h3>
          <div className="flex justify-between items-center mb-2">
            <span className="text-orange-300/70 text-sm">Total votes: 89</span>
            <span className="text-orange-400 text-sm">Active</span>
          </div>
          <div className="bg-black/40 rounded-full h-2">
            <div className="bg-gradient-to-r from-orange-400 to-yellow-400 h-2 rounded-full w-3/4" />
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-orange-500/20">
          <h3 className="text-orange-200 font-medium mb-2">Favorite hold duration?</h3>
          <div className="flex justify-between items-center mb-2">
            <span className="text-orange-300/70 text-sm">Total votes: 156</span>
            <span className="text-yellow-400 text-sm">2 days left</span>
          </div>
          <div className="bg-black/40 rounded-full h-2">
            <div className="bg-gradient-to-r from-orange-400 to-yellow-400 h-2 rounded-full w-full" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <User size={40} className="text-black" />
        </div>
        <h2 className="text-xl font-bold text-orange-400">Your Profile</h2>
        <p className="text-orange-300/70">@hivemember2024</p>
      </div>

      <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-orange-500/20">
        <h3 className="text-orange-200 font-medium mb-3">Stats Overview</h3>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-orange-400">15</div>
            <div className="text-orange-300/60 text-sm">Polls Created</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-400">89</div>
            <div className="text-orange-300/60 text-sm">Days Active</div>
          </div>
        </div>
      </div>

      <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-orange-500/20">
        <h3 className="text-orange-200 font-medium mb-3">Achievements</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              🏆
            </div>
            <span className="text-orange-200 text-sm">Poll Master - Created 10+ polls</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
              🔥
            </div>
            <span className="text-orange-200 text-sm">Streak Keeper - 30 day streak</span>
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
        <div className="flex bg-black/40 backdrop-blur-sm rounded-2xl p-1 border border-orange-500/20">
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
                    ? "bg-orange-500/20 text-orange-400" 
                    : "text-orange-200/70 hover:text-orange-200 hover:bg-orange-500/10"
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
