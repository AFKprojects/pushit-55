
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
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const calculateTimeLeft = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return "Zakończone";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} dni`;
    if (hours > 0) return `${hours}h`;
    
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${minutes}min`;
  };

  const fetchPolls = async () => {
    try {
      setLoading(true);
      
      // Fetch polls with options
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

      if (pollsError) throw pollsError;

      let userVotes = [];
      if (user) {
        const { data: votesData, error: votesError } = await supabase
          .from('user_votes')
          .select('poll_id, option_id')
          .eq('user_id', user.id);
        
        if (votesError) throw votesError;
        userVotes = votesData || [];
      }

      const processedPolls = pollsData?.map((poll) => {
        const userVote = userVotes.find(v => v.poll_id === poll.id);
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

      setPolls(processedPolls);
    } catch (error) {
      console.error('Error fetching polls:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać ankiet",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const voteOnPoll = async (pollId: string, optionId: string) => {
    if (!user) {
      toast({
        title: "Błąd",
        description: "Musisz być zalogowany aby głosować",
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
        title: "Sukces",
        description: "Twój głos został zapisany!",
      });

      // Refresh polls to show updated vote counts
      fetchPolls();
    } catch (error: any) {
      console.error('Error voting:', error);
      toast({
        title: "Błąd",
        description: error.message.includes('duplicate key') 
          ? "Już głosowałeś w tej ankiecie" 
          : "Nie udało się zagłosować",
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
        title: "Sukces",
        description: "Ankieta została zapisana do 'Do głosowania'",
      });
    } catch (error) {
      console.error('Error saving poll:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się zapisać ankiety",
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

      // Remove poll from current list
      setPolls(prev => prev.filter(poll => poll.id !== pollId));
      
      toast({
        title: "Sukces",
        description: "Ankieta została ukryta",
      });
    } catch (error) {
      console.error('Error hiding poll:', error);
      toast({
        title: "Błąd",
        description: "Nie udało się ukryć ankiety",
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
    loading,
    voteOnPoll,
    savePoll,
    hidePoll,
    refetch: fetchPolls
  };
};
