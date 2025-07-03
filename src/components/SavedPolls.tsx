
import { useSavedPolls } from '@/hooks/useSavedPolls';
import { useButtonHolds } from '@/hooks/useButtonHolds';
import { useSavedPollVoting } from '@/hooks/useSavedPollVoting';
import PollCard from './PollCard';
import SavedPollsLoading from './SavedPollsLoading';
import SavedPollsEmpty from './SavedPollsEmpty';

const SavedPolls = () => {
  const { savedPolls, loading, removeSavedPoll, refreshSavedPolls } = useSavedPolls();
  const { startHold, endHold } = useButtonHolds();
  const { votingState, handleVoteStart: originalHandleVoteStart, handleVoteEnd: originalHandleVoteEnd } = useSavedPollVoting();

  const handleVoteStart = async (pollId: string, optionIndex: number) => {
    const poll = savedPolls.find(p => p.id === pollId);
    if (poll) {
      // Start the button hold tracking
      startHold();
      
      originalHandleVoteStart(pollId, optionIndex, poll);
      // Remove from saved polls after voting
      setTimeout(async () => {
        await removeSavedPoll(pollId);
        refreshSavedPolls();
      }, 3500); // Wait for vote animation to complete
    }
  };

  const handleVoteEnd = () => {
    // End the button hold tracking
    endHold();
    originalHandleVoteEnd();
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
          onVote={handleVoteStart}
          onRemove={removeSavedPoll}
          votingState={votingState}
          onVoteEnd={handleVoteEnd}
          showActions={true}
          expandable={false}
          alwaysExpanded={true}
          canVote={true}
        />
      ))}
    </div>
  );
};

export default SavedPolls;
