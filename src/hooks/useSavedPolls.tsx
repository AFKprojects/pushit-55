
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface SavedPoll {
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
  hasVoted?: boolean;
  userVote?: string;
}

export const useSavedPolls = () => {
  const [savedPolls, setSavedPolls] = useState<SavedPoll[]>([]);
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

  const fetchSavedPolls = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data: savedData, error: savedError } = await supabase
        .from('saved_polls')
        .select(`
          poll_id,
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

      if (savedError) throw savedError;

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
            status: poll.status,
            total_votes: poll.total_votes,
            expires_at: poll.expires_at,
            created_at: poll.created_at,
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

  return {
    savedPolls,
    loading,
    removeSavedPoll,
    refreshSavedPolls: fetchSavedPolls
  };
};
