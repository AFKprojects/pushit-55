
import { useState, useEffect } from 'react';
import { TrendingUp, Users, Clock, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface SavedPoll {
  id: string;
  question: string;
  creator_username: string;
  total_votes: number;
  expires_at: string;
  options: Array<{
    id: string;
    option_text: string;
    votes: number;
    percentage: number;
  }>;
  timeLeft: string;
  hasVoted?: boolean;
  userVote?: string;
}

const SavedPolls = () => {
  const [savedPolls, setSavedPolls] = useState<SavedPoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingOption, setVotingOption] = useState<{pollId: string, optionIndex: number} | null>(null);
  const [votingProgress, setVotingProgress] = useState(0);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

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

  const fetchSavedPolls = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get saved polls with poll details
      const { data: savedData, error: savedError } = await supabase
        .from('saved_polls')
        .select(`
          poll_id,
          polls (
            id,
            question,
            creator_username,
            total_votes,
            expires_at,
            poll_options (
              id,
              option_text,
              votes
            )
          )
        `)
        .eq('user_id', user.id);

      if (savedError) throw savedError;

      // Get user votes for saved polls
      const pollIds = savedData?.map(s => s.poll_id) || [];
      const { data: votesData } = await supabase
        .from('user_votes')
        .select('poll_id, option_id')
        .eq('user_id', user.id)
        .in('poll_id', pollIds);

      const processedPolls = savedData
        ?.filter(item => item.polls)
        ?.map((item) => {
          const poll = item.polls;
          const userVote = votesData?.find(v => v.poll_id === poll.id);
          const options = poll.poll_options.map(opt => ({
            id: opt.id,
            option_text: opt.option_text,
            votes: opt.votes,
            percentage: poll.total_votes > 0 ? Math.round((opt.votes / poll.total_votes) * 100) : 0
          }));

          return {
            id: poll.id,
            question: poll.question,
            creator_username: poll.creator_username,
            total_votes: poll.total_votes,
            expires_at: poll.expires_at,
            options,
            timeLeft: calculateTimeLeft(poll.expires_at),
            hasVoted: !!userVote,
            userVote: userVote?.option_id
          };
        }) || [];

      setSavedPolls(processedPolls);
    } catch (error) {
      console.error('Error fetching saved polls:', error);
      toast({
        title: "Error",
        description: "Failed to fetch saved polls",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVoteStart = (pollId: string, optionIndex: number) => {
    if (votingOption || !user) return;
    
    const poll = savedPolls.find(p => p.id === pollId);
    if (poll?.hasVoted) return;
    
    setVotingOption({ pollId, optionIndex });
    setVotingProgress(0);
    setCountdownSeconds(3);
    
    const interval = setInterval(() => {
      setVotingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          handleVoteComplete(pollId, optionIndex);
          return 100;
        }
        return prev + (100 / 30);
      });
    }, 100);

    const countdownInterval = setInterval(() => {
      setCountdownSeconds(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleVoteEnd = () => {
    setVotingOption(null);
    setVotingProgress(0);
    setCountdownSeconds(0);
  };

  const handleVoteComplete = async (pollId: string, optionIndex: number) => {
    const poll = savedPolls.find(p => p.id === pollId);
    if (poll && poll.options[optionIndex]) {
      try {
        const { error } = await supabase
          .from('user_votes')
          .insert({
            poll_id: pollId,
            option_id: poll.options[optionIndex].id,
            user_id: user!.id
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Your vote has been recorded!",
        });

        // Remove from saved polls after voting
        await removeSavedPoll(pollId);
        fetchSavedPolls();
      } catch (error: any) {
        console.error('Error voting:', error);
        toast({
          title: "Error",
          description: error.message.includes('duplicate key') 
            ? "You have already voted in this poll" 
            : "Failed to vote",
          variant: "destructive",
        });
      }
    }
    handleVoteEnd();
  };

  const removeSavedPoll = async (pollId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('saved_polls')
        .delete()
        .eq('poll_id', pollId)
        .eq('user_id', user.id);

      if (error) throw error;

      setSavedPolls(prev => prev.filter(poll => poll.id !== pollId));
      
      toast({
        title: "Success",
        description: "Poll removed from saved",
      });
    } catch (error) {
      console.error('Error removing saved poll:', error);
      toast({
        title: "Error",
        description: "Failed to remove saved poll",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchSavedPolls();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-orange-200">Loading saved polls...</div>
      </div>
    );
  }

  if (savedPolls.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-orange-300/70 mb-2">No saved polls</p>
        <p className="text-orange-300/50 text-sm">Save polls from the main feed to vote on them later</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {savedPolls.map((poll) => (
        <div key={poll.id} className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/30">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-orange-200 mb-2">
                {poll.question}
              </h3>
              <p className="text-orange-300/60 text-sm">created by {poll.creator_username}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center text-orange-300/70 text-sm">
                <Clock size={16} className="mr-1" />
                {poll.timeLeft}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => removeSavedPoll(poll.id)}
                className="border-red-500/30 text-red-300 hover:bg-red-500/10"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            {poll.options.map((option, index) => {
              const isVoting = votingOption?.pollId === poll.id && votingOption?.optionIndex === index;
              const isUserVote = poll.hasVoted && poll.userVote === option.id;
              return (
                <div
                  key={option.id}
                  className={`bg-black/20 rounded-lg p-3 cursor-pointer hover:bg-black/40 transition-colors relative overflow-hidden ${
                    poll.hasVoted ? 'cursor-default' : ''
                  } ${isUserVote ? 'ring-2 ring-orange-400' : ''}`}
                  onMouseDown={() => !poll.hasVoted && handleVoteStart(poll.id, index)}
                  onMouseUp={handleVoteEnd}
                  onMouseLeave={handleVoteEnd}
                  onTouchStart={() => !poll.hasVoted && handleVoteStart(poll.id, index)}
                  onTouchEnd={handleVoteEnd}
                >
                  {isVoting && (
                    <>
                      <div 
                        className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-yellow-500/20 transition-all duration-100"
                        style={{ width: `${votingProgress}%` }}
                      />
                      {countdownSeconds > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center z-20">
                          <div className="bg-orange-500 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold animate-pulse">
                            {countdownSeconds}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  
                  <div className="relative z-10">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-orange-200">{option.option_text}</span>
                      <span className="text-orange-300/80 text-sm">{option.percentage}%</span>
                    </div>
                    <div className="bg-black/40 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-orange-400 to-yellow-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${option.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-orange-300/70 text-sm">
            <div className="flex items-center">
              <Users size={16} className="mr-1" />
              {poll.total_votes} votes
            </div>
            <div className="flex items-center">
              <TrendingUp size={16} className="mr-1" />
              {poll.hasVoted ? 'Voted' : 'Saved'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SavedPolls;
