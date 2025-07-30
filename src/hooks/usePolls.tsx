
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { handleSecureError, RateLimiter } from '@/utils/security';

interface Poll {
  id: string;
  question: string;
  creator_username: string;
  status: 'active' | 'archived';
  total_votes: number;
  boostCount: number;
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
  hotScore?: number;
}

type SortMode = 'new' | 'popular' | 'hot';

// Rate limiters for different operations
const voteRateLimiter = new RateLimiter(20, 60 * 1000); // 20 votes per minute
const actionRateLimiter = new RateLimiter(10, 60 * 1000); // 10 save/hide actions per minute

export const usePolls = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [archivedPolls, setArchivedPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>('hot');
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
          boost_count,
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
          boost_count,
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

            // Calculate hot score based on votes and pushes with time decay
            const ageInHours = (Date.now() - new Date(poll.created_at).getTime()) / (1000 * 60 * 60);
            const timeFactor = Math.max(0.1, 1 / (1 + ageInHours * 0.1)); // Decay over time
            const hotScore = (actualTotalVotes + (poll.boost_count || 0) * 3) * timeFactor;

            return {
              id: poll.id,
              question: poll.question,
              creator_username: poll.creator_username,
              status: poll.status,
              total_votes: actualTotalVotes, // Use calculated total instead of stored value
              boostCount: poll.boost_count || 0,
              expires_at: poll.expires_at,
              created_at: poll.created_at,
              options,
              timeLeft: calculateTimeLeft(poll.expires_at),
              hasVoted: !!userVote,
              userVote: userVote?.option_id,
              hotScore
            };
          }) || [];
      };

      // Filter out hidden polls and process remaining polls
      const processedPolls = processPolls(pollsData || []);
      const processedArchivedPolls = processPolls(archivedData || []);

      // Sort polls based on current sort mode
      const sortedPolls = sortPolls(processedPolls, sortMode);

      setPolls(sortedPolls);
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

    // Rate limiting for votes
    if (!voteRateLimiter.canPerform(user.id)) {
      toast({
        title: "Rate limit exceeded",
        description: "You're voting too quickly. Please slow down.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if user has already voted
      const { data: existingVote } = await supabase
        .from('user_votes')
        .select('id, option_id')
        .eq('poll_id', pollId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingVote) {
        // Update existing vote (edit vote)
        const { error } = await supabase
          .from('user_votes')
          .update({ option_id: optionId })
          .eq('id', existingVote.id);

        if (error) throw error;

        toast({
          title: "Vote Updated",
          description: "Your vote has been changed!",
        });
      } else {
        // Create new vote
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
      }

      // Refresh polls to show updated vote counts
      fetchPolls();
    } catch (error: any) {
      const safeErrorMessage = handleSecureError(error, 'voteOnPoll');
      toast({
        title: "Error",
        description: safeErrorMessage,
        variant: "destructive",
      });
    }
  };

  const savePoll = async (pollId: string) => {
    if (!user) return;

    // Rate limiting for actions
    if (!actionRateLimiter.canPerform(user.id)) {
      toast({
        title: "Rate limit exceeded",
        description: "You're performing actions too quickly. Please slow down.",
        variant: "destructive",
      });
      return;
    }

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
      const safeErrorMessage = handleSecureError(error, 'savePoll');
      toast({
        title: "Error",
        description: safeErrorMessage,
        variant: "destructive",
      });
    }
  };

  const hidePoll = async (pollId: string) => {
    if (!user) return;

    // Rate limiting for actions
    if (!actionRateLimiter.canPerform(user.id)) {
      toast({
        title: "Rate limit exceeded",
        description: "You're performing actions too quickly. Please slow down.",
        variant: "destructive",
      });
      return;
    }

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
      const safeErrorMessage = handleSecureError(error, 'hidePoll');
      toast({
        title: "Error",
        description: safeErrorMessage,
        variant: "destructive",
      });
    }
  };

  // Sort polls based on mode
  const sortPolls = (pollsToSort: Poll[], mode: SortMode): Poll[] => {
    const sorted = [...pollsToSort];
    
    switch (mode) {
      case 'new':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'popular':
        return sorted.sort((a, b) => b.total_votes - a.total_votes);
      case 'hot':
        return sorted.sort((a, b) => (b.hotScore || 0) - (a.hotScore || 0));
      default:
        return sorted;
    }
  };

  // Update sort mode and re-sort polls
  const updateSortMode = (mode: SortMode) => {
    setSortMode(mode);
    setPolls(prev => sortPolls(prev, mode));
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

  const searchArchivedPoll = async (pollId: string) => {
    try {
      setLoading(true);
      
      const { data: pollData, error } = await supabase
        .from('polls')
        .select(`
          id,
          question,
          creator_username,
          status,
          total_votes,
          boost_count,
          expires_at,
          created_at,
          poll_options (
            id,
            option_text,
            votes
          )
        `)
        .eq('id', pollId)
        .eq('status', 'archived')
        .single();

      if (error) {
        toast({
          title: "Not Found",
          description: "No archived poll found with that ID",
          variant: "destructive",
        });
        return;
      }

      if (!pollData) {
        toast({
          title: "Not Found", 
          description: "No archived poll found with that ID",
          variant: "destructive",
        });
        return;
      }

      // Process the single poll result manually (since processPolls is in scope of fetchPolls)
      const userVote = user ? await supabase
        .from('user_votes')
        .select('option_id')
        .eq('poll_id', pollData.id)
        .eq('user_id', user.id)
        .single() : null;

      const actualTotalVotes = pollData.poll_options.reduce((sum: number, opt: any) => sum + opt.votes, 0);
      
      const options = pollData.poll_options.map((opt: any) => ({
        id: opt.id,
        option_text: opt.option_text,
        votes: opt.votes,
        percentage: actualTotalVotes > 0 ? Math.round((opt.votes / actualTotalVotes) * 100) : 0
      }));

      const ageInHours = (Date.now() - new Date(pollData.created_at).getTime()) / (1000 * 60 * 60);
      const timeFactor = Math.max(0.1, 1 / (1 + ageInHours * 0.1));
      const hotScore = (actualTotalVotes + (pollData.boost_count || 0) * 3) * timeFactor;

      const processedPoll = {
        id: pollData.id,
        question: pollData.question,
        creator_username: pollData.creator_username,
        status: pollData.status,
        total_votes: actualTotalVotes,
        boostCount: pollData.boost_count || 0,
        expires_at: pollData.expires_at,
        created_at: pollData.created_at,
        options,
        timeLeft: calculateTimeLeft(pollData.expires_at),
        hasVoted: !!userVote?.data,
        userVote: userVote?.data?.option_id,
        hotScore
      };

      setArchivedPolls([processedPoll]);
      toast({
        title: "Found",
        description: "Archived poll found!",
      });
    } catch (error) {
      console.error('Error searching archived poll:', error);
      toast({
        title: "Error",
        description: "Failed to search for poll",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    polls,
    archivedPolls,
    loading,
    sortMode,
    voteOnPoll,
    savePoll,
    hidePoll,
    updateSortMode,
    searchArchivedPoll,
    refetch: fetchPolls
  };
};
