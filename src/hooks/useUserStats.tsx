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
    // Use RPC function for optimized stats fetching
    const { data, error } = await supabase
      .rpc('get_user_stats', { user_uuid: user.id });

    if (error) {
      console.error('Error fetching stats:', error);
      return;
    }

    const statsData = data?.[0];
    if (statsData) {
      setStats({
        createdPolls: Number(statsData.created_polls) || 0,
        votesCast: Number(statsData.votes_cast) || 0,
        votesReceived: Number(statsData.votes_received) || 0,
        boostsReceived: Number(statsData.boosts_received) || 0
      });
    }
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