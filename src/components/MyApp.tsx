
import { useState } from 'react';
import { Users, BarChart3, Clock, Vote, Archive, BookmarkPlus, Eye, TrendingUp, User, Settings, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Poll {
  id: number;
  question: string;
  votes: number;
  status: 'live' | 'archive';
  timeLeft?: string;
}

const MyApp = () => {
  const [activeSection, setActiveSection] = useState('mysubjects');
  const [mySubjectsTab, setMySubjectsTab] = useState('created');
  const [profileTab, setProfileTab] = useState('account');
  const [liveExpanded, setLiveExpanded] = useState(true);
  const [archiveExpanded, setArchiveExpanded] = useState(false);

  // Mock data
  const [createdPolls] = useState<Poll[]>([
    { id: 1, question: "Best time to push?", votes: 89, status: 'live', timeLeft: '2 days left' },
    { id: 2, question: "Favorite push duration?", votes: 156, status: 'live', timeLeft: '5h left' },
    { id: 3, question: "Best button color?", votes: 67, status: 'archive' },
    { id: 4, question: "Morning vs evening?", votes: 234, status: 'archive' },
    { id: 5, question: "Preferred style?", votes: 89, status: 'archive' },
  ]);

  const [votedPolls] = useState<Poll[]>([
    { id: 4, question: "Morning or evening sessions?", votes: 234, status: 'archive' },
    { id: 5, question: "Preferred interaction style?", votes: 189, status: 'archive' },
  ]);

  const [toVotePolls] = useState<Poll[]>([
    { id: 6, question: "What motivates you to push?", votes: 45, status: 'live', timeLeft: '12 mins left' },
    { id: 7, question: "Ideal session length?", votes: 78, status: 'live', timeLeft: '1 day left' },
  ]);

  const sections = [
    { id: 'mysubjects', label: 'My Subjects', icon: BarChart3 },
    { id: 'community', label: 'Community', icon: Users },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const renderMySubjects = () => {
    const mySubjectsTabs = [
      { id: 'created', label: 'Created' },
      { id: 'voted', label: 'Voted' },
      { id: 'tovote', label: 'To Vote' },
    ];

    const renderCreatedPolls = () => {
      const livePolls = createdPolls.filter(poll => poll.status === 'live');
      const archivePolls = createdPolls.filter(poll => poll.status === 'archive');

      return (
        <div className="space-y-4">
          {/* Live Section */}
          <div className="bg-black/20 rounded-lg">
            <button
              onClick={() => setLiveExpanded(!liveExpanded)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-black/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                {liveExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span className="text-blue-200 font-medium">Live</span>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <span className="text-blue-300/70 text-sm">{livePolls.length} active</span>
            </button>
            
            {liveExpanded && (
              <div className="px-4 pb-4 space-y-3">
                {livePolls.map((poll) => (
                  <div key={poll.id} className="bg-black/20 rounded-lg p-4">
                    <h4 className="text-blue-200 font-medium mb-2">{poll.question}</h4>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-blue-300/70">{poll.votes} votes</span>
                      {poll.timeLeft && (
                        <span className="text-green-400 flex items-center gap-1">
                          <Clock size={12} />
                          {poll.timeLeft}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Archive Section */}
          <div className="bg-black/20 rounded-lg">
            <button
              onClick={() => setArchiveExpanded(!archiveExpanded)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-black/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                {archiveExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span className="text-blue-200 font-medium">Archive</span>
              </div>
              <span className="text-blue-300/70 text-sm">{archivePolls.length} ended</span>
            </button>
            
            {archiveExpanded && (
              <div className="px-4 pb-4 space-y-3">
                {archivePolls.map((poll) => (
                  <div key={poll.id} className="bg-black/20 rounded-lg p-4">
                    <h4 className="text-blue-200 font-medium mb-2">{poll.question}</h4>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-blue-300/70">{poll.votes} votes</span>
                      <span className="text-gray-400 flex items-center gap-1">
                        <Archive size={12} />
                        Ended
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    };

    const renderVotedPolls = () => (
      <div className="space-y-3">
        {votedPolls.map((poll) => (
          <div key={poll.id} className="bg-black/20 rounded-lg p-4">
            <h4 className="text-blue-200 font-medium mb-2">{poll.question}</h4>
            <div className="flex justify-between items-center text-sm">
              <span className="text-blue-300/70">{poll.votes} total votes</span>
              <span className="text-green-400 flex items-center gap-1">
                <Vote size={12} />
                Voted
              </span>
            </div>
          </div>
        ))}
      </div>
    );

    const renderToVotePolls = () => (
      <div className="space-y-3">
        {toVotePolls.map((poll) => (
          <div key={poll.id} className="bg-black/20 rounded-lg p-4">
            <h4 className="text-blue-200 font-medium mb-2">{poll.question}</h4>
            <div className="flex justify-between items-center text-sm">
              <span className="text-blue-300/70">{poll.votes} votes</span>
              <div className="flex items-center gap-2">
                {poll.timeLeft && (
                  <span className="text-blue-400 flex items-center gap-1">
                    <Clock size={12} />
                    {poll.timeLeft}
                  </span>
                )}
                <span className="text-yellow-400 flex items-center gap-1">
                  <BookmarkPlus size={12} />
                  Saved
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );

    const renderMySubjectsContent = () => {
      switch (mySubjectsTab) {
        case 'created':
          return renderCreatedPolls();
        case 'voted':
          return renderVotedPolls();
        case 'tovote':
          return renderToVotePolls();
        default:
          return renderCreatedPolls();
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex bg-black/40 rounded-xl p-1">
          {mySubjectsTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMySubjectsTab(tab.id)}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200",
                mySubjectsTab === tab.id
                  ? "bg-blue-500/20 text-blue-400"
                  : "text-blue-200/70 hover:text-blue-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {renderMySubjectsContent()}
      </div>
    );
  };

  const renderCommunity = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-blue-400 mb-2">Your Community</h2>
        <p className="text-blue-200/70">See your impact and connections</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/20 text-center">
          <Eye size={24} className="text-blue-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-400">127</div>
          <div className="text-blue-300/60 text-sm">Observers</div>
        </div>
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/20 text-center">
          <Vote size={24} className="text-cyan-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-400">342</div>
          <div className="text-blue-300/60 text-sm">Subject Votes</div>
        </div>
      </div>

      <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/20">
        <h3 className="text-blue-200 font-medium mb-3 flex items-center gap-2">
          <TrendingUp size={20} className="text-blue-400" />
          Recent Activity
        </h3>
        <div className="space-y-2 text-blue-300/70 text-sm">
          <p>• 12 new observers this week</p>
          <p>• Your subject got 67 new votes</p>
          <p>• 3 people commented on your subjects</p>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => {
    const profileTabs = [
      { id: 'account', label: 'Account' },
      { id: 'settings', label: 'Settings' },
    ];

    return (
      <div className="space-y-4">
        <div className="flex bg-black/40 rounded-xl p-1">
          {profileTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setProfileTab(tab.id)}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200",
                profileTab === tab.id
                  ? "bg-blue-500/20 text-blue-400"
                  : "text-blue-200/70 hover:text-blue-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {profileTab === 'account' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <User size={40} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-blue-200">Welcome back!</h2>
              <p className="text-blue-300/70">@username</p>
            </div>

            <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/20">
              <div className="flex items-center gap-3 mb-3">
                <BarChart3 size={20} className="text-blue-400" />
                <span className="text-blue-200 font-medium">Your Stats</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-400">15</div>
                  <div className="text-blue-300/60 text-sm">Subjects Created</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-400">342</div>
                  <div className="text-blue-300/60 text-sm">Total Votes</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {profileTab === 'settings' && (
          <div className="space-y-4">
            <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/20">
              <div className="flex items-center gap-3 mb-4">
                <Settings size={20} className="text-blue-400" />
                <span className="text-blue-200 font-medium">App Settings</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-blue-200">Notifications</span>
                  <button className="w-12 h-6 bg-blue-500 rounded-full relative">
                    <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-200">Dark Mode</span>
                  <button className="w-12 h-6 bg-blue-500 rounded-full relative">
                    <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-200">Privacy Mode</span>
                  <button className="w-12 h-6 bg-gray-600 rounded-full relative">
                    <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/20">
              <h3 className="text-blue-200 font-medium mb-3">Account Actions</h3>
              <div className="space-y-2">
                <button className="w-full text-left text-blue-200 hover:text-blue-400 py-2 px-3 rounded hover:bg-black/20 transition-colors">
                  Change Password
                </button>
                <button className="w-full text-left text-blue-200 hover:text-blue-400 py-2 px-3 rounded hover:bg-black/20 transition-colors">
                  Export Data
                </button>
                <button className="w-full text-left text-red-400 hover:text-red-300 py-2 px-3 rounded hover:bg-black/20 transition-colors">
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'mysubjects':
        return renderMySubjects();
      case 'community':
        return renderCommunity();
      case 'profile':
        return renderProfile();
      default:
        return renderMySubjects();
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Section Navigation */}
      <div className="px-6 py-4">
        <div className="flex bg-black/40 backdrop-blur-sm rounded-2xl p-1 border border-blue-500/20">
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
                    ? "bg-blue-500/20 text-blue-400" 
                    : "text-blue-200/70 hover:text-blue-200 hover:bg-blue-500/10"
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
