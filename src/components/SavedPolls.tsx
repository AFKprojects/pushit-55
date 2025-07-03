
import { useSavedPolls } from '@/hooks/useSavedPolls';
import { useSavedPollVoting } from '@/hooks/useSavedPollVoting';
import PollCard from './PollCard';
import SavedPollsLoading from './SavedPollsLoading';
import SavedPollsEmpty from './SavedPollsEmpty';

const SavedPolls = () => {
  const { savedPolls, loading, removeSavedPoll, refreshSavedPolls } = useSavedPolls();
  const { votingState, handleVoteStart, handleVoteEnd } = useSavedPollVoting();

  const handleVote = async (pollId: string, optionIndex: number) => {
    const poll = savedPolls.find(p => p.id === pollId);
    if (poll) {
      handleVoteStart(pollId, optionIndex, poll);
      // Remove from saved polls after voting
      setTimeout(async () => {
        await removeSavedPoll(pollId);
        refreshSavedPolls();
      }, 3500); // Wait for vote animation to complete
    }
  };

  if (loading) {
    return <SavedPollsLoading />;
  }

  if (savedPolls.length === 0) {
    return <SavedPollsEmpty />;
  }

  return (
    <div className="space-y-6">
      {savedPolls.map((poll) => (
        <PollCard
          key={poll.id}
          poll={poll}
          onVote={handleVote}
          onRemove={removeSavedPoll}
          votingState={votingState}
          onVoteEnd={handleVoteEnd}
          showActions={true}
          expandable={true}
          canVote={true}
        />
      ))}
    </div>
  );
};

export default SavedPolls;
