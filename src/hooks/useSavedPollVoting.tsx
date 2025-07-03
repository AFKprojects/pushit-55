
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const useSavedPollVoting = () => {
  const [votingOption, setVotingOption] = useState<{pollId: string, optionIndex: number} | null>(null);
  const [votingProgress, setVotingProgress] = useState(0);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleVoteStart = (pollId: string, optionIndex: number, poll: any) => {
    if (votingOption || !user || poll?.hasVoted) return;
    
    setVotingOption({ pollId, optionIndex });
    setVotingProgress(0);
    setCountdownSeconds(3);
    
    const interval = setInterval(() => {
      setVotingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          handleVoteComplete(pollId, optionIndex, poll);
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

  const handleVoteComplete = async (pollId: string, optionIndex: number, poll: any) => {
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

        return true;
      } catch (error: any) {
        console.error('Error voting:', error);
        toast({
          title: "Error",
          description: error.message.includes('duplicate key') 
            ? "You have already voted in this poll" 
            : "Failed to vote",
          variant: "destructive",
        });
        return false;
      }
    }
    handleVoteEnd();
    return false;
  };

  const votingState = votingOption ? {
    pollId: votingOption.pollId,
    optionIndex: votingOption.optionIndex,
    progress: votingProgress,
    countdown: countdownSeconds
  } : null;

  return {
    votingState,
    handleVoteStart,
    handleVoteEnd,
    handleVoteComplete
  };
};
