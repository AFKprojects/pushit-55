
import { useState } from 'react';
import { TrendingUp, Users, Clock, BookmarkPlus, EyeOff } from 'lucide-react';
import { usePolls } from '@/hooks/usePolls';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PollsProps {
  onNavigateToCreate?: () => void;
}

const Polls = ({ onNavigateToCreate }: PollsProps) => {
  const { polls, archivedPolls, loading, voteOnPoll, savePoll, hidePoll } = usePolls();
  const { user } = useAuth();
  const [votingOption, setVotingOption] = useState<{pollId: string, optionIndex: number} | null>(null);
  const [votingProgress, setVotingProgress] = useState(0);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const votingTimer = useState<NodeJS.Timeout | null>(null)[0];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-orange-200">Loading polls...</div>
      </div>
    );
  }

  const handleVoteStart = (pollId: string, optionIndex: number) => {
    if (votingOption || !user) return;
    
    const poll = polls.find(p => p.id === pollId);
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
    if (votingTimer) {
      clearInterval(votingTimer);
    }
    setVotingOption(null);
    setVotingProgress(0);
    setCountdownSeconds(0);
  };

  const handleVoteComplete = async (pollId: string, optionIndex: number) => {
    const poll = polls.find(p => p.id === pollId);
    if (poll && poll.options[optionIndex]) {
      await voteOnPoll(pollId, poll.options[optionIndex].id);
    }
    handleVoteEnd();
  };

  const handleSavePoll = async (pollId: string) => {
    const poll = polls.find(p => p.id === pollId);
    if (poll?.hasVoted) return;
    await savePoll(pollId);
  };

  const handleHidePoll = async (pollId: string) => {
    await hidePoll(pollId);
  };

  const renderPollsList = (pollsList: typeof polls, isArchive = false) => (
    <div className="space-y-6">
      {pollsList.map((poll) => (
        <div key={poll.id} className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/30">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-orange-200 mb-2">
                {poll.question}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center text-orange-300/70 text-sm">
                <Clock size={16} className="mr-1" />
                {poll.timeLeft}
              </div>
              {user && !poll.hasVoted && !isArchive && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSavePoll(poll.id)}
                    className="border-orange-500/30 text-orange-300 hover:bg-orange-500/10"
                  >
                    <BookmarkPlus size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleHidePoll(poll.id)}
                    className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                  >
                    <EyeOff size={16} />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 mb-4">
            {poll.options.map((option, index) => {
              const isVoting = votingOption?.pollId === poll.id && votingOption?.optionIndex === index;
              const isUserVote = poll.hasVoted && poll.userVote === option.id;
              const canVote = !poll.hasVoted && user && !isArchive;
              return (
                <div
                  key={option.id}
                  className={`bg-black/20 rounded-lg p-3 ${canVote ? 'cursor-pointer hover:bg-black/40' : 'cursor-default'} transition-colors relative overflow-hidden ${
                    isUserVote ? 'ring-2 ring-orange-400' : ''
                  }`}
                  onMouseDown={() => canVote && handleVoteStart(poll.id, index)}
                  onMouseUp={handleVoteEnd}
                  onMouseLeave={handleVoteEnd}
                  onTouchStart={() => canVote && handleVoteStart(poll.id, index)}
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
              {poll.hasVoted ? 'Voted' : isArchive ? 'Ended' : 'Active'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex-1 px-6 py-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-yellow-500 bg-clip-text text-transparent mb-2">
            Vote on topics that interest you
          </h1>
          <p className="text-gray-300">
            Express your opinion on the topics below
          </p>
        </div>

        {!user && (
          <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-4 mb-6 text-center">
            <p className="text-orange-200">
              Log in to vote and create polls
            </p>
          </div>
        )}

        <Tabs defaultValue="live" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="live">Live</TabsTrigger>
            <TabsTrigger value="archive">Archive</TabsTrigger>
          </TabsList>

          <TabsContent value="live">
            {renderPollsList(polls)}
            
            {polls.length === 0 && (
              <div className="text-center py-12">
                <p className="text-orange-300/70 mb-4">No active polls</p>
                <button 
                  onClick={onNavigateToCreate}
                  className="bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-xl px-6 py-3 border border-orange-500/30 text-orange-200 font-medium transition-colors"
                >
                  Create first poll
                </button>
              </div>
            )}

            <div className="mt-8 text-center">
              <button 
                onClick={onNavigateToCreate}
                className="bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-xl px-6 py-3 border border-orange-500/30 text-orange-200 font-medium transition-colors"
              >
                Create your poll
              </button>
            </div>
          </TabsContent>

          <TabsContent value="archive">
            {renderPollsList(archivedPolls, true)}
            
            {archivedPolls.length === 0 && (
              <div className="text-center py-12">
                <p className="text-orange-300/70">No archived polls</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Polls;
