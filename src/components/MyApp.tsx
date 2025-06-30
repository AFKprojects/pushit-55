import { useState, useEffect } from 'react';
import { Users, BarChart3, Clock, Vote, Archive, BookmarkPlus, Eye, TrendingUp, User, Settings, ChevronDown, ChevronRight, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface Poll {
  id: string;
  question: string;
  total_votes: number;
  status: 'active' | 'archived';
  timeLeft?: string;
  expires_at: string;
}

interface UserStats {
  createdPolls: number;
  totalVotes: number;
  observers: number;
}

const MyApp = () => {
  const [activeSection, setActiveSection] = useState('mysubjects');
  const [mySubjectsTab, setMySubjectsTab] = useState('created');
  const [profileTab, setProfileTab] = useState('account');
  const [liveExpanded, setLiveExpanded] = useState(true);
  const [archiveExpanded, setArchiveExpanded] = useState(false);
  const [createdPolls, setCreatedPolls] = useState<Poll[]>([]);
  const [votedPolls, setVotedPolls] = useState<Poll[]>([]);
  const [savedPolls, setSavedPolls] = useState<Poll[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({ createdPolls: 0, totalVotes: 0, observers: 0 });
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();
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

      // Fetch voted polls
      const { data: voted } = await supabase
        .from('user_votes')
        .select(`
          poll_id,
          polls!inner(id, question, total_votes, status, expires_at)
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
        
        if (diff <= 0) return "Zakończone";
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        if (days > 0) return `${days} dni`;
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

      setCreatedPolls(processPolls(created || []));
      setVotedPolls(processPolls(voted?.map(v => v.polls) || []));
      setSavedPolls(processPolls(saved?.map(s => s.polls) || []));

      // Calculate stats
      const totalVotesReceived = (created || []).reduce((sum, poll) => sum + poll.total_votes, 0);
      setUserStats({
        createdPolls: created?.length || 0,
        totalVotes: totalVotesReceived,
        observers: Math.floor(Math.random() * 50) + 10 // Placeholder - w przyszłości można dodać system obserwujących
      });

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-8 border border-blue-500/20 text-center max-w-sm">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={32} className="text-white" />
          </div>
          
          <h3 className="text-xl font-bold text-blue-200 mb-2">Dołącz do społeczności</h3>
          <p className="text-blue-200/70 text-sm mb-6">
            Utwórz konto aby zarządzać swoimi ankietami, śledzić statystyki i korzystać z pełnej funkcjonalności
          </p>
          
          <Button 
            onClick={() => navigate('/auth')}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 rounded-xl mb-3 flex items-center justify-center gap-2"
          >
            <LogIn size={18} />
            Zaloguj się / Zarejestruj
          </Button>
          
          <p className="text-blue-200/50 text-xs">
            Kontynuuj jako gość aby używać podstawowych funkcji
          </p>
        </div>
      </div>
    );
  }

  const sections = [
    { id: 'mysubjects', label: 'Moje ankiety', icon: BarChart3 },
    { id: 'community', label: 'Społeczność', icon: Users },
    { id: 'profile', label: 'Profil', icon: User },
  ];

  const renderMySubjects = () => {
    const mySubjectsTabs = [
      { id: 'created', label: 'Utworzone' },
      { id: 'voted', label: 'Zagłosowane' },
      { id: 'tovote', label: 'Do głosowania' },
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
                <span className="text-blue-200 font-medium">Aktywne</span>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <span className="text-blue-300/70 text-sm">{livePolls.length} aktywnych</span>
            </button>
            
            {liveExpanded && (
              <div className="px-4 pb-4 space-y-3">
                {livePolls.map((poll) => (
                  <div key={poll.id} className="bg-black/20 rounded-lg p-4">
                    <h4 className="text-blue-200 font-medium mb-2">{poll.question}</h4>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-blue-300/70">{poll.total_votes} głosów</span>
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
                  <p className="text-blue-300/50 text-sm p-4">Brak aktywnych ankiet</p>
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
                <span className="text-blue-200 font-medium">Archiwum</span>
              </div>
              <span className="text-blue-300/70 text-sm">{archivePolls.length} zakończonych</span>
            </button>
            
            {archiveExpanded && (
              <div className="px-4 pb-4 space-y-3">
                {archivePolls.map((poll) => (
                  <div key={poll.id} className="bg-black/20 rounded-lg p-4">
                    <h4 className="text-blue-200 font-medium mb-2">{poll.question}</h4>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-blue-300/70">{poll.total_votes} głosów</span>
                      <span className="text-gray-400 flex items-center gap-1">
                        <Archive size={12} />
                        Zakończone
                      </span>
                    </div>
                  </div>
                ))}
                {archivePolls.length === 0 && (
                  <p className="text-blue-300/50 text-sm p-4">Brak zakończonych ankiet</p>
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
          <div key={poll.id} className="bg-black/20 rounded-lg p-4">
            <h4 className="text-blue-200 font-medium mb-2">{poll.question}</h4>
            <div className="flex justify-between items-center text-sm">
              <span className="text-blue-300/70">{poll.total_votes} głosów łącznie</span>
              <span className="text-green-400 flex items-center gap-1">
                <Vote size={12} />
                Zagłosowano
              </span>
            </div>
          </div>
        ))}
        {votedPolls.length === 0 && (
          <p className="text-blue-300/50 text-sm p-4">Nie zagłosowałeś jeszcze w żadnej ankiecie</p>
        )}
      </div>
    );

    const renderToVotePolls = () => (
      <div className="space-y-3">
        {savedPolls.map((poll) => (
          <div key={poll.id} className="bg-black/20 rounded-lg p-4">
            <h4 className="text-blue-200 font-medium mb-2">{poll.question}</h4>
            <div className="flex justify-between items-center text-sm">
              <span className="text-blue-300/70">{poll.total_votes} głosów</span>
              <div className="flex items-center gap-2">
                {poll.timeLeft && (
                  <span className="text-blue-400 flex items-center gap-1">
                    <Clock size={12} />
                    {poll.timeLeft}
                  </span>
                )}
                <span className="text-yellow-400 flex items-center gap-1">
                  <BookmarkPlus size={12} />
                  Zapisane
                </span>
              </div>
            </div>
          </div>
        ))}
        {savedPolls.length === 0 && (
          <p className="text-blue-300/50 text-sm p-4">Nie masz zapisanych ankiet</p>
        )}
      </div>
    );

    const renderMySubjectsContent = () => {
      if (loading) {
        return <div className="text-center py-8 text-blue-300/70">Ładowanie...</div>;
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

  const renderCommunity = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-blue-400 mb-2">Twoja społeczność</h2>
        <p className="text-blue-200/70">Zobacz swój wpływ i połączenia</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/20 text-center">
          <Eye size={24} className="text-blue-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-400">{userStats.observers}</div>
          <div className="text-blue-300/60 text-sm">Obserwujących</div>
        </div>
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/20 text-center">
          <Vote size={24} className="text-cyan-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-400">{userStats.totalVotes}</div>
          <div className="text-blue-300/60 text-sm">Głosów otrzymanych</div>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => {
    const profileTabs = [
      { id: 'account', label: 'Konto' },
      { id: 'settings', label: 'Ustawienia' },
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
              <h2 className="text-xl font-bold text-blue-200">Witaj ponownie!</h2>
              <p className="text-blue-300/70">{user.email}</p>
            </div>

            <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/20">
              <div className="flex items-center gap-3 mb-3">
                <BarChart3 size={20} className="text-blue-400" />
                <span className="text-blue-200 font-medium">Twoje statystyki</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-400">{userStats.createdPolls}</div>
                  <div className="text-blue-300/60 text-sm">Utworzonych ankiet</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-400">{userStats.totalVotes}</div>
                  <div className="text-blue-300/60 text-sm">Otrzymanych głosów</div>
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
                <span className="text-blue-200 font-medium">Ustawienia aplikacji</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-blue-200">Powiadomienia</span>
                  <button className="w-12 h-6 bg-blue-500 rounded-full relative">
                    <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-200">Tryb ciemny</span>
                  <button className="w-12 h-6 bg-blue-500 rounded-full relative">
                    <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-200">Tryb prywatny</span>
                  <button className="w-12 h-6 bg-gray-600 rounded-full relative">
                    <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
                  </button>
                </div>
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
