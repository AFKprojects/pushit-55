
import { useState } from 'react';
import { usePolls } from '@/hooks/usePolls';
import { useAuth } from '@/hooks/useAuth';
import { usePushSystem } from '@/hooks/usePushSystem';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PollCard from './PollCard';
import SortingTabs from './SortingTabs';
import PushLimitIndicator from './PushLimitIndicator';
import ArchiveSearch from './ArchiveSearch';

interface PollsProps {
  onNavigateToCreate?: () => void;
}

const Polls = ({ onNavigateToCreate }: PollsProps) => {
  const { polls, archivedPolls, loading, sortMode, voteOnPoll, savePoll, hidePoll, updateSortMode, searchArchivedPoll } = usePolls();
  const { user } = useAuth();
  const { pushLimits, pushPoll, canPushPoll, hasPushedPoll } = usePushSystem();
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
    
    // For edit vote button, optionIndex is -1, allow user to select any option
    if (optionIndex === -1) {
      // This is an edit vote action
      const poll = polls.find(p => p.id === pollId);
      if (!poll?.hasVoted) return; // Only allow edit if they already voted
      // Don't set a specific option, let user click on the option they want
      return;
    } else {
      // This is a regular vote on a specific option
      const poll = polls.find(p => p.id === pollId);
      if (!poll) return;
    }
    
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

  const handlePushPoll = async (pollId: string) => {
    await pushPoll(pollId);
  };

  const renderPollsList = (pollsList: typeof polls, isArchive = false) => (
    <div className="space-y-6">
      {pollsList.map((poll) => (
        <PollCard
          key={poll.id}
          poll={poll}
          user={user}
          isArchive={isArchive}
          votingOption={votingOption}
          votingProgress={votingProgress}
          countdownSeconds={countdownSeconds}
          onVoteStart={handleVoteStart}
          onVoteEnd={handleVoteEnd}
          onSavePoll={handleSavePoll}
          onHidePoll={handleHidePoll}
          onPushPoll={handlePushPoll}
          canPushPoll={canPushPoll}
          hasPushedPoll={hasPushedPoll}
        />
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

        {user && (
          <div className="mb-6">
            <PushLimitIndicator pushLimits={pushLimits} />
          </div>
        )}

        <div className="mb-6">
          <SortingTabs sortMode={sortMode} onSortChange={updateSortMode} />
        </div>

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
                  Create your poll
                </button>
              </div>
            )}

            {polls.length > 0 && (
              <div className="mt-8 text-center">
                <button 
                  onClick={onNavigateToCreate}
                  className="bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-xl px-6 py-3 border border-orange-500/30 text-orange-200 font-medium transition-colors"
                >
                  Create your poll
                </button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="archive">
            <ArchiveSearch onSearch={searchArchivedPoll} isLoading={loading} />
            
            {renderPollsList(archivedPolls, true)}
            
            {archivedPolls.length === 0 && (
              <div className="text-center py-12">
                <p className="text-orange-300/70">Search for archived polls by ID</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Polls;
