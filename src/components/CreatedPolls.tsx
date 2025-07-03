
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import PollCard from './PollCard';

interface CreatedPoll {
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
}

const CreatedPolls = () => {
  const [createdPolls, setCreatedPolls] = useState<CreatedPoll[]>([]);
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

  const fetchCreatedPolls = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data: pollsData, error } = await supabase
        .from('polls')
        .select(`
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
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedPolls = pollsData?.map((poll) => {
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
          timeLeft: calculateTimeLeft(poll.expires_at)
        };
      }) || [];

      setCreatedPolls(processedPolls);
    } catch (error) {
      console.error('Error fetching created polls:', error);
      toast({
        title: "Error",
        description: "Failed to fetch your polls",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deletePoll = async (pollId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('polls')
        .delete()
        .eq('id', pollId)
        .eq('created_by', user.id);

      if (error) throw error;

      setCreatedPolls(prev => prev.filter(poll => poll.id !== pollId));
      
      toast({
        title: "Success",
        description: "Poll deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting poll:', error);
      toast({
        title: "Error",
        description: "Failed to delete poll",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchCreatedPolls();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-orange-200">Loading your polls...</div>
      </div>
    );
  }

  if (createdPolls.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-orange-300/70 mb-4">You haven't created any polls yet</p>
        <p className="text-orange-300/50 text-sm">Create your first poll to see it here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {createdPolls.map((poll) => (
        <PollCard
          key={poll.id}
          poll={poll}
          onRemove={deletePoll}
          showActions={true}
          expandable={false}
          alwaysExpanded={true}
          canVote={false}
        />
      ))}
    </div>
  );
};

export default CreatedPolls;
