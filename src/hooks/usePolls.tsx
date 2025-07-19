
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface Poll {
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

export const usePolls = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [archivedPolls, setArchivedPolls] = useState<Poll[]>([]);
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

  const fetchPolls = async () => {
    try {
      setLoading(true);
      
      // First, run cleanup to archive expired polls and delete old ones
      try {
        await supabase.functions.invoke('manage-polls', {
          method: 'POST'
        });
      } catch (cleanupError) {
        console.warn('Cleanup function failed, continuing with fetch:', cleanupError);
      }
      
      // Fetch active polls with options
      const { data: pollsData, error: pollsError } = await supabase
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
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      // Fetch archived polls with options
      const { data: archivedData, error: archivedError } = await supabase
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
        .eq('status', 'archived')
        .order('created_at', { ascending: false });

      if (pollsError) throw pollsError;
      if (archivedError) throw archivedError;

      let userVotes = [];
      let hiddenPolls = [];
      
      if (user) {
        // Get user votes
        const { data: votesData, error: votesError } = await supabase
          .from('user_votes')
          .select('poll_id, option_id')
          .eq('user_id', user.id);
        
        if (votesError) throw votesError;
        userVotes = votesData || [];

        // Get hidden polls
        const { data: hiddenData, error: hiddenError } = await supabase
          .from('hidden_polls')
          .select('poll_id')
          .eq('user_id', user.id);
        
        if (hiddenError) throw hiddenError;
        hiddenPolls = hiddenData?.map(h => h.poll_id) || [];
      }

      // Process polls function
      const processPolls = (pollData: any[]) => {
        return pollData
          ?.filter(poll => !hiddenPolls.includes(poll.id))
          ?.map((poll) => {
            const userVote = userVotes.find(v => v.poll_id === poll.id);
            
            // Calculate total votes from actual option votes (more reliable)
            const actualTotalVotes = poll.poll_options.reduce((sum: number, opt: any) => sum + opt.votes, 0);
            
            const options = poll.poll_options.map(opt => ({
              id: opt.id,
              option_text: opt.option_text,
              votes: opt.votes,
              percentage: actualTotalVotes > 0 ? Math.round((opt.votes / actualTotalVotes) * 100) : 0
            }));

            return {
              id: poll.id,
              question: poll.question,
              creator_username: poll.creator_username,
              status: poll.status,
              total_votes: actualTotalVotes, // Use calculated total instead of stored value
              expires_at: poll.expires_at,
              created_at: poll.created_at,
              options,
              timeLeft: calculateTimeLeft(poll.expires_at),
              hasVoted: !!userVote,
              userVote: userVote?.option_id
            };
          }) || [];
      };

      // Filter out hidden polls and process remaining polls
      const processedPolls = processPolls(pollsData || []);
      const processedArchivedPolls = processPolls(archivedData || []);

      setPolls(processedPolls);
      setArchivedPolls(processedArchivedPolls);
    } catch (error) {
      console.error('Error fetching polls:', error);
      toast({
        title: "Error",
        description: "Failed to fetch polls",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const voteOnPoll = async (pollId: string, optionId: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to vote",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('user_votes')
        .insert({
          poll_id: pollId,
          option_id: optionId,
          user_id: user.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your vote has been recorded!",
      });

      // Refresh polls to show updated vote counts
      fetchPolls();
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
  };

  const savePoll = async (pollId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('saved_polls')
        .insert({
          poll_id: pollId,
          user_id: user.id
        });

      if (error && !error.message.includes('duplicate key')) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Poll saved for later voting",
      });
    } catch (error) {
      console.error('Error saving poll:', error);
      toast({
        title: "Error",
        description: "Failed to save poll",
        variant: "destructive",
      });
    }
  };

  const hidePoll = async (pollId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('hidden_polls')
        .insert({
          poll_id: pollId,
          user_id: user.id
        });

      if (error && !error.message.includes('duplicate key')) {
        throw error;
      }

      // Remove poll from current list immediately
      setPolls(prev => prev.filter(poll => poll.id !== pollId));
      
      toast({
        title: "Success",
        description: "Poll hidden",
      });
    } catch (error) {
      console.error('Error hiding poll:', error);
      toast({
        title: "Error",
        description: "Failed to hide poll",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchPolls();

    // Set up real-time subscription for polls and votes
    const pollsChannel = supabase
      .channel('polls-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'polls'
      }, () => {
        fetchPolls();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_votes'
      }, () => {
        fetchPolls();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(pollsChannel);
    };
  }, [user]);

  return {
    polls,
    archivedPolls,
    loading,
    voteOnPoll,
    savePoll,
    hidePoll,
    refetch: fetchPolls
  };
};
