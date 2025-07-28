
import { useState, useEffect } from 'react';
import { Users, BarChart3, Clock, Vote, Archive, BookmarkPlus, Eye, TrendingUp, User, Settings, ChevronDown, ChevronRight, LogIn, LogOut, Rocket, Search, UserPlus, Award, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { usePollManagement } from '@/hooks/usePollManagement';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { usePollModal } from '@/hooks/usePollModal';
import { useUserModal } from '@/hooks/useUserModal';

interface Poll {
  id: string;
  question: string;
  total_votes: number;
  status: 'active' | 'archived';
  timeLeft?: string;
  expires_at: string;
  options?: Array<{
    id: string;
    option_text: string;
    votes: number;
    percentage: number;
  }>;
  userVote?: string;
}

interface UserStats {
  createdPolls: number;
  totalVotes: number;
  observers: number;
  following: number;
  votesReceived: number;
  boostsReceived: number;
  votesCast: number;
}

const MyApp = () => {
  const [activeSection, setActiveSection] = useState('mysubjects');
  const [mySubjectsTab, setMySubjectsTab] = useState('created');
  const [profileTab, setProfileTab] = useState('account');
  const [liveExpanded, setLiveExpanded] = useState(true);
  const [archiveExpanded, setArchiveExpanded] = useState(false);
  const [expandedPoll, setExpandedPoll] = useState<string | null>(null);
  const [createdPolls, setCreatedPolls] = useState<Poll[]>([]);
  const [votedPolls, setVotedPolls] = useState<Poll[]>([]);
  const [savedPolls, setSavedPolls] = useState<Poll[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({ createdPolls: 0, totalVotes: 0, observers: 0, following: 0, votesReceived: 0, boostsReceived: 0, votesCast: 0 });
  const [loading, setLoading] = useState(true);
  const [searchUsername, setSearchUsername] = useState('');
  
  const { user, signOut } = useAuth();
  const { managePollsCleanup, isManaging } = usePollManagement();
  const { openModal } = usePollModal();
  const { openModal: openUserModal } = useUserModal();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      // Fetch created polls
      const { data: created } = await supabase
        .from('polls')
        .select('id, question, total_votes, status, expires_at')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      // Fetch voted polls with options and user votes
      const { data: voted } = await supabase
        .from('user_votes')
        .select(`
          poll_id,
          option_id,
          polls!inner(
            id, 
            question, 
            total_votes, 
            status, 
            expires_at,
            poll_options(id, option_text, votes)
          )
        `)
        .eq('user_id', user.id);

      // Fetch saved polls
      const { data: saved } = await supabase
        .from('saved_polls')
        .select(`
          poll_id,
          polls!inner(id, question, total_votes, status, expires_at)
        `)
        .eq('user_id', user.id);

      // Calculate time left for polls
      const calculateTimeLeft = (expiresAt: string) => {
        const now = new Date();
        const expiry = new Date(expiresAt);
        const diff = expiry.getTime() - now.getTime();
        
        if (diff <= 0) return "Ended";
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        if (days > 0) return `${days} days`;
        if (hours > 0) return `${hours}h`;
        
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${minutes}min`;
      };

      const processPolls = (polls: any[]) => 
        polls?.map(poll => ({
          ...poll,
          timeLeft: calculateTimeLeft(poll.expires_at),
          status: new Date(poll.expires_at) < new Date() ? 'archived' : poll.status
        })) || [];

      const processVotedPolls = (votedData: any[]) => 
        votedData?.map(v => {
          const poll = v.polls;
          const options = poll.poll_options?.map((opt: any) => ({
            id: opt.id,
            option_text: opt.option_text,
            votes: opt.votes,
            percentage: poll.total_votes > 0 ? Math.round((opt.votes / poll.total_votes) * 100) : 0
          })) || [];
          
          return {
            ...poll,
            options,
            userVote: v.option_id,
            timeLeft: calculateTimeLeft(poll.expires_at),
            status: new Date(poll.expires_at) < new Date() ? 'archived' : poll.status
          };
        }) || [];

      setCreatedPolls(processPolls(created || []));
      setVotedPolls(processVotedPolls(voted || []));
      setSavedPolls(processPolls(saved?.map(s => s.polls) || []));

      // Calculate stats
      const totalVotesReceived = (created || []).reduce((sum, poll) => sum + poll.total_votes, 0);
      const totalVotesCast = voted?.length || 0;
      
      setUserStats({
        createdPolls: created?.length || 0,
        totalVotes: totalVotesReceived,
        observers: Math.floor(Math.random() * 50) + 10, // Placeholder
        following: Math.floor(Math.random() * 25) + 5, // Placeholder
        votesReceived: totalVotesReceived,
        boostsReceived: Math.floor(Math.random() * 100) + 20, // Placeholder
        votesCast: totalVotesCast
      });

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const changeVote = async (pollId: string, newOptionId: string) => {
    if (!user) return;
    
    try {
      // Update the existing vote
      const { error } = await supabase
        .from('user_votes')
        .update({ option_id: newOptionId })
        .eq('poll_id', pollId)
        .eq('user_id', user.id);

      if (!error) {
        // Refresh data
        fetchUserData();
        setExpandedPoll(null);
      }
    } catch (error) {
      console.error('Error changing vote:', error);
    }
  };

  const handlePollCleanup = async () => {
    try {
      await managePollsCleanup();
      fetchUserData(); // Refresh data after cleanup
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-8 border border-blue-500/20 text-center max-w-sm">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={32} className="text-white" />
          </div>
          
          <h3 className="text-xl font-bold text-blue-200 mb-2">Join the community</h3>
          <p className="text-blue-200/70 text-sm mb-6">
            Create an account to manage your polls, track statistics and use full functionality
          </p>
          
          <Button 
            onClick={() => navigate('/auth')}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 rounded-xl mb-3 flex items-center justify-center gap-2"
          >
            <LogIn size={18} />
            Login / Register
          </Button>
          
          <p className="text-blue-200/50 text-xs">
            Continue as guest to use basic features
          </p>
        </div>
      </div>
    );
  }

  const sections = [
    { id: 'mysubjects', label: 'My Polls', icon: BarChart3 },
    { id: 'community', label: 'Community', icon: Users },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const renderMySubjects = () => {
    const mySubjectsTabs = [
      { id: 'created', label: 'Created' },
      { id: 'voted', label: 'Voted' },
      { id: 'tovote', label: 'Saved' },
    ];

    const renderCreatedPolls = () => {
      const livePolls = createdPolls.filter(poll => poll.status === 'active');
      const archivePolls = createdPolls.filter(poll => poll.status === 'archived');

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
                <span className="text-blue-200 font-medium">Active</span>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <span className="text-blue-300/70 text-sm">{livePolls.length} active</span>
            </button>
            
            {liveExpanded && (
              <div className="px-4 pb-4 space-y-3">
                {livePolls.map((poll) => (
                     <div 
                    key={poll.id} 
                    className="bg-black/20 rounded-lg p-4 cursor-pointer hover:bg-black/30 transition-colors"
                    onClick={() => openModal(poll.id)}
                  >
                    <h4 className="text-blue-200 font-medium mb-2">{poll.question}</h4>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-blue-300/70">{poll.total_votes} votes</span>
                      {poll.timeLeft && (
                        <span className="text-green-400 flex items-center gap-1">
                          <Clock size={12} />
                          {poll.timeLeft}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {livePolls.length === 0 && (
                  <p className="text-blue-300/50 text-sm p-4">No active polls</p>
                )}
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
                  <div 
                    key={poll.id} 
                    className="bg-black/20 rounded-lg p-4 cursor-pointer hover:bg-black/30 transition-colors"
                    onClick={() => openModal(poll.id)}
                  >
                    <h4 className="text-blue-200 font-medium mb-2">{poll.question}</h4>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-blue-300/70">{poll.total_votes} votes</span>
                      <span className="text-gray-400 flex items-center gap-1">
                        <Archive size={12} />
                        Ended
                      </span>
                    </div>
                  </div>
                ))}
                {archivePolls.length === 0 && (
                  <p className="text-blue-300/50 text-sm p-4">No ended polls</p>
                )}
              </div>
            )}
          </div>
        </div>
      );
    };

    const renderVotedPolls = () => (
      <div className="space-y-3">
        {votedPolls.map((poll) => (
          <div 
            key={poll.id} 
            className="bg-black/20 rounded-lg p-4 cursor-pointer hover:bg-black/30 transition-colors"
            onClick={() => openModal(poll.id)}
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-blue-200 font-medium flex-1">{poll.question}</h4>
            </div>
            <div className="flex justify-between items-center text-sm mt-2">
              <span className="text-blue-300/70">{poll.total_votes} total votes</span>
              <span className="text-green-400 flex items-center gap-1">
                <Vote size={12} />
                Voted
              </span>
            </div>
          </div>
        ))}
        {votedPolls.length === 0 && (
          <p className="text-blue-300/50 text-sm p-4">You haven't voted in any polls yet</p>
        )}
      </div>
    );

    const renderToVotePolls = () => (
      <div className="space-y-3">
        {savedPolls.map((poll) => (
          <div 
            key={poll.id} 
            className="bg-black/20 rounded-lg p-4 cursor-pointer hover:bg-black/30 transition-colors"
            onClick={() => openModal(poll.id)}
          >
            <h4 className="text-blue-200 font-medium mb-2">{poll.question}</h4>
            <div className="flex justify-between items-center text-sm">
              <span className="text-blue-300/70">{poll.total_votes} votes</span>
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
        {savedPolls.length === 0 && (
          <p className="text-blue-300/50 text-sm p-4">No saved polls</p>
        )}
      </div>
    );

    const renderMySubjectsContent = () => {
      if (loading) {
        return <div className="text-center py-8 text-blue-300/70">Loading...</div>;
      }

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

  const handleUserSearch = () => {
    if (searchUsername.trim()) {
      openUserModal(searchUsername.trim());
      setSearchUsername('');
    }
  };

  const renderCommunity = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-blue-400 mb-2">Your community</h2>
        <p className="text-blue-200/70">See your impact and connections</p>
      </div>

      {/* User Search */}
      <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/20">
        <h3 className="text-lg font-semibold text-blue-200 mb-3 flex items-center gap-2">
          <Search size={20} />
          Find Users
        </h3>
        <div className="flex gap-2">
          <Input
            placeholder="Enter username..."
            value={searchUsername}
            onChange={(e) => setSearchUsername(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleUserSearch()}
            className="bg-black/20 border-blue-500/30 text-blue-200 placeholder:text-blue-300/50"
          />
          <Button
            onClick={handleUserSearch}
            className="bg-blue-500/20 border-blue-500/30 text-blue-300 hover:bg-blue-500/30"
            variant="outline"
          >
            <Search size={16} />
          </Button>
        </div>
      </div>

      {/* Community Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div 
          className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/20 text-center cursor-pointer hover:bg-black/50 transition-colors"
          onClick={() => {
            toast({
              title: "Coming Soon",
              description: "Followers list will be available soon!",
            });
          }}
        >
          <Eye size={24} className="text-blue-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-400">{userStats.observers}</div>
          <div className="text-blue-300/60 text-sm">Followers</div>
        </div>
        <div 
          className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/20 text-center cursor-pointer hover:bg-black/50 transition-colors"
          onClick={() => {
            toast({
              title: "Coming Soon",
              description: "Following list will be available soon!",
            });
          }}
        >
          <UserPlus size={24} className="text-green-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-400">{userStats.following}</div>
          <div className="text-blue-300/60 text-sm">Following</div>
        </div>
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/20 text-center">
          <Vote size={24} className="text-cyan-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-400">{userStats.votesReceived}</div>
          <div className="text-blue-300/60 text-sm">Votes received</div>
        </div>
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/20 text-center">
          <Rocket size={24} className="text-orange-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-400">{userStats.boostsReceived}</div>
          <div className="text-blue-300/60 text-sm">Boosts received</div>
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
              <p className="text-blue-300/70">{user.email}</p>
            </div>

            <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/20">
              <div className="flex items-center gap-3 mb-3">
                <BarChart3 size={20} className="text-blue-400" />
                <span className="text-blue-200 font-medium">Your statistics</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-400">{userStats.createdPolls}</div>
                  <div className="text-blue-300/60 text-sm">Created polls</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-400">{userStats.totalVotes}</div>
                  <div className="text-blue-300/60 text-sm">Votes received</div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut size={18} className="mr-2" />
              Sign out
            </Button>
          </div>
        )}

        {profileTab === 'settings' && (
          <div className="space-y-4">
            <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/20">
              <div className="flex items-center gap-3 mb-4">
                <Settings size={20} className="text-blue-400" />
                <span className="text-blue-200 font-medium">App settings</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-blue-200">Notifications</span>
                  <button className="w-12 h-6 bg-blue-500 rounded-full relative">
                    <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-200">Dark mode</span>
                  <button className="w-12 h-6 bg-blue-500 rounded-full relative">
                    <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-200">Private mode</span>
                  <button className="w-12 h-6 bg-gray-600 rounded-full relative">
                    <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/20">
              <div className="flex items-center gap-3 mb-4">
                <Archive size={20} className="text-blue-400" />
                <span className="text-blue-200 font-medium">Poll Management</span>
              </div>
              <p className="text-blue-300/70 text-sm mb-4">
                Clean up expired polls and remove old data automatically
              </p>
              <Button
                onClick={handlePollCleanup}
                disabled={isManaging}
                variant="outline"
                className="w-full border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
              >
                {isManaging ? 'Cleaning...' : 'Run Cleanup'}
              </Button>
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
