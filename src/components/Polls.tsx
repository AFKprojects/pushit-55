
import { useState } from 'react';
import { usePolls } from '@/hooks/usePolls';
import { useAuth } from '@/hooks/useAuth';
import { useButtonHolds } from '@/hooks/useButtonHolds';
import PollCard from './PollCard';

interface PollsProps {
  onNavigateToCreate?: () => void;
}

const Polls = ({ onNavigateToCreate }: PollsProps) => {
  const { polls, loading, voteOnPoll, savePoll, hidePoll } = usePolls();
  const { user } = useAuth();
  const { startHold, endHold } = useButtonHolds();
  const [votingOption, setVotingOption] = useState<{pollId: string, optionIndex: number} | null>(null);
  const [votingProgress, setVotingProgress] = useState(0);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [votingTimer, setVotingTimer] = useState<NodeJS.Timeout | null>(null);

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
    
    // Start the button hold tracking
    startHold();
    
    setVotingOption({ pollId, optionIndex });
    setVotingProgress(0);
    setCountdownSeconds(3);
    
    // Progress bar animation (3 seconds total)
    const progressInterval = setInterval(() => {
      setVotingProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          handleVoteComplete(pollId, optionIndex);
          return 100;
        }
        return prev + (100 / 30); // 100% over 30 intervals = 3 seconds
      });
    }, 100);

    // Countdown timer (3 seconds)
    const countdownInterval = setInterval(() => {
      setCountdownSeconds(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setVotingTimer(progressInterval);
  };

  const handleVoteEnd = () => {
    if (votingTimer) {
      clearInterval(votingTimer);
      setVotingTimer(null);
    }
    
    // End the button hold tracking
    endHold();
    
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

  const votingState = votingOption ? {
    pollId: votingOption.pollId,
    optionIndex: votingOption.optionIndex,
    progress: votingProgress,
    countdown: countdownSeconds
  } : null;

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

        <div className="space-y-6">
          {polls.map((poll) => (
            <PollCard
              key={poll.id}
              poll={poll}
              onVote={handleVoteStart}
              onSave={user && !poll.hasVoted ? handleSavePoll : undefined}
              onHide={user && !poll.hasVoted ? handleHidePoll : undefined}
              votingState={votingState}
              onVoteEnd={handleVoteEnd}
              showActions={!!user}
              expandable={false}
              alwaysExpanded={true}
              canVote={!!user}
            />
          ))}
        </div>

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
      </div>
    </div>
  );
};

export default Polls;
