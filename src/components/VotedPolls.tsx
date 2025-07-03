
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import PollCard from './PollCard';

interface VotedPoll {
  id: string;
  question: string;
  creator_username: string;
  status: 'active' | 'archived';
  total_votes: number;
  expires_at: string;
  created_at: string;
  options: Array<{
    id: string;
    option_text: string;
    votes: number;
    percentage: number;
  }>;
  timeLeft: string;
  hasVoted: boolean;
  userVote: string;
}

const VotedPolls = () => {
  const [votedPolls, setVotedPolls] = useState<VotedPoll[]>([]);
  const [loading, setLoading] = useState(true);
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

  const fetchVotedPolls = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get polls user has voted on
      const { data: votesData, error: votesError } = await supabase
        .from('user_votes')
        .select(`
          poll_id,
          option_id,
          polls (
            id,
            question,
            creator_username,
            status,
            total_votes,
            expires_at,
            created_at,
            poll_options (
              id,
              option_text,
              votes
            )
          )
        `)
        .eq('user_id', user.id);

      if (votesError) throw votesError;

      const processedPolls = votesData
        ?.filter(vote => vote.polls)
        ?.map((vote) => {
          const poll = vote.polls;
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
            status: poll.status,
            total_votes: poll.total_votes,
            expires_at: poll.expires_at,
            created_at: poll.created_at,
            options,
            timeLeft: calculateTimeLeft(poll.expires_at),
            hasVoted: true,
            userVote: vote.option_id
          };
        }) || [];

      setVotedPolls(processedPolls);
    } catch (error) {
      console.error('Error fetching voted polls:', error);
      toast({
        title: "Error",
        description: "Failed to fetch voted polls",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVotedPolls();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-orange-200">Loading voted polls...</div>
      </div>
    );
  }

  if (votedPolls.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-orange-300/70 mb-4">You haven't voted on any polls yet</p>
        <p className="text-orange-300/50 text-sm">Vote on polls to see them here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {votedPolls.map((poll) => (
        <PollCard
          key={poll.id}
          poll={poll}
          showActions={false}
          expandable={false}
          alwaysExpanded={true}
          canVote={false}
        />
      ))}
    </div>
  );
};

export default VotedPolls;
