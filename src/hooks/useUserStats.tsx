import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserStats {
  createdPolls: number;
  votesCast: number;
  votesReceived: number;
  boostsReceived: number;
}

export const useUserStats = () => {
  const [stats, setStats] = useState<UserStats>({
    createdPolls: 0,
    votesCast: 0,
    votesReceived: 0,
    boostsReceived: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchStatsManual = async () => {
    if (!user) return;

    try {
      // Get created polls count
      const { count: createdCount } = await supabase
        .from('polls')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user.id);

      // Get votes cast count  
      const { count: votesCount } = await supabase
        .from('user_votes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Get user's polls for vote/boost calculations
      const { data: userPolls } = await supabase
        .from('polls')
        .select('push_count, total_votes')
        .eq('created_by', user.id);

      const votesReceived = userPolls?.reduce((sum: number, poll: any) => sum + (poll.total_votes || 0), 0) || 0;
      const boostsReceived = userPolls?.reduce((sum: number, poll: any) => sum + (poll.push_count || 0), 0) || 0;

      setStats({
        createdPolls: createdCount || 0,
        votesCast: votesCount || 0,
        votesReceived,
        boostsReceived
      });
    } catch (error) {
      console.error('Error in manual stats fetch:', error);
    }
  };

  const fetchStats = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      await fetchStatsManual();
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStats();
    } else {
      setStats({ createdPolls: 0, votesCast: 0, votesReceived: 0, boostsReceived: 0 });
      setLoading(false);
    }
  }, [user?.id]);

  return {
    stats,
    loading,
    refetch: fetchStats
  };
};