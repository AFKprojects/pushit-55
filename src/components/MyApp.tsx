

import { useState } from 'react';
import { Users, BarChart3, Clock, Vote, Archive, BookmarkPlus, Eye, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Poll {
  id: number;
  question: string;
  votes: number;
  status: 'live' | 'archive';
  timeLeft?: string;
}

const MyApp = () => {
  const [activeSection, setActiveSection] = useState('mypolls');
  const [myPollsTab, setMyPollsTab] = useState('created');
  const [createdTab, setCreatedTab] = useState('live');

  // Mock data
  const [createdPolls] = useState<Poll[]>([
    { id: 1, question: "Best time to hold?", votes: 89, status: 'live', timeLeft: '2 days' },
    { id: 2, question: "Favorite hold duration?", votes: 156, status: 'live', timeLeft: '5 days' },
    { id: 3, question: "Best button color?", votes: 67, status: 'archive' },
  ]);

  const [votedPolls] = useState<Poll[]>([
    { id: 4, question: "Morning or evening sessions?", votes: 234, status: 'archive' },
    { id: 5, question: "Preferred interaction style?", votes: 189, status: 'archive' },
  ]);

  const [toVotePolls] = useState<Poll[]>([
    { id: 6, question: "What motivates you to hold?", votes: 45, status: 'live', timeLeft: '3 days' },
    { id: 7, question: "Ideal session length?", votes: 78, status: 'live', timeLeft: '1 day' },
  ]);

  const sections = [
    { id: 'mypolls', label: 'My Polls', icon: BarChart3 },
    { id: 'community', label: 'Community', icon: Users },
  ];

  const renderMyPolls = () => {
    const myPollsTabs = [
      { id: 'created', label: 'Created' },
      { id: 'voted', label: 'Voted' },
      { id: 'tovote', label: 'To Vote' },
    ];

    const renderCreatedPolls = () => {
      const createdTabs = [
        { id: 'live', label: 'Live' },
        { id: 'archive', label: 'Archive' },
      ];

      const filteredPolls = createdPolls.filter(poll => poll.status === createdTab);

      return (
        <div className="space-y-4">
          <div className="flex bg-black/20 rounded-lg p-1">
            {createdTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCreatedTab(tab.id)}
                className={cn(
                  "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200",
                  createdTab === tab.id
                    ? "bg-blue-500/20 text-blue-400"
                    : "text-blue-200/70 hover:text-blue-200"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredPolls.map((poll) => (
              <div key={poll.id} className="bg-black/20 rounded-lg p-4">
                <h4 className="text-blue-200 font-medium mb-2">{poll.question}</h4>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-300/70">{poll.votes} votes</span>
                  {poll.status === 'live' && poll.timeLeft && (
                    <span className="text-blue-400 flex items-center gap-1">
                      <Clock size={12} />
                      {poll.timeLeft}
                    </span>
                  )}
                  {poll.status === 'archive' && (
                    <span className="text-gray-400 flex items-center gap-1">
                      <Archive size={12} />
                      Ended
                    </span>
                  )}
                </div>
              </div>
            ))}
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

    const renderMyPollsContent = () => {
      switch (myPollsTab) {
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
          {myPollsTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMyPollsTab(tab.id)}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200",
                myPollsTab === tab.id
                  ? "bg-blue-500/20 text-blue-400"
                  : "text-blue-200/70 hover:text-blue-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {renderMyPollsContent()}
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
          <div className="text-blue-300/60 text-sm">Poll Votes</div>
        </div>
      </div>

      <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/20">
        <h3 className="text-blue-200 font-medium mb-3 flex items-center gap-2">
          <TrendingUp size={20} className="text-blue-400" />
          Recent Activity
        </h3>
        <div className="space-y-2 text-blue-300/70 text-sm">
          <p>• 12 new observers this week</p>
          <p>• Your poll got 67 new votes</p>
          <p>• 3 people commented on your polls</p>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'mypolls':
        return renderMyPolls();
      case 'community':
        return renderCommunity();
      default:
        return renderMyPolls();
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

