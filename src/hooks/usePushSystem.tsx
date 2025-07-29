import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface BoostLimits {
  boostsUsed: number;
  maxBoosts: number;
  canBoost: boolean;
}

export const usePushSystem = () => {
  const [boostLimits, setBoostLimits] = useState<BoostLimits>({
    boostsUsed: 0,
    maxBoosts: 3,
    canBoost: true
  });
  const { user } = useAuth();

  // Fetch current boost limits for user
  const fetchBoostLimits = useCallback(async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('daily_boost_limits')
        .select('*')
        .eq('user_id', user.id)
        .eq('boost_date', today)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching boost limits:', error);
        return;
      }

      if (data) {
        setBoostLimits({
          boostsUsed: data.boost_count,
          maxBoosts: data.max_boosts,
          canBoost: data.boost_count < data.max_boosts
        });
      } else {
        // No record exists, create one
        const { error: insertError } = await supabase
          .from('daily_boost_limits')
          .insert({
            user_id: user.id,
            boost_date: today,
            boost_count: 0,
            max_boosts: 3
          });

        if (insertError) {
          console.error('Error creating boost limits:', insertError);
        } else {
          setBoostLimits({
            boostsUsed: 0,
            maxBoosts: 3,
            canBoost: true
          });
        }
      }
    } catch (error) {
      console.error('Error in fetchBoostLimits:', error);
    }
  }, [user]);

  // Boost a poll
  const boostPoll = useCallback(async (pollId: string) => {
    if (!user || !boostLimits.canBoost) {
      toast.error('Daily boost limit reached');
      return false;
    }

    try {
      // Check if user already boosted this poll
      const { data: existingBoost, error: checkError } = await supabase
        .from('user_boosts')
        .select('id')
        .eq('user_id', user.id)
        .eq('poll_id', pollId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing boost:', checkError);
        return false;
      }

      if (existingBoost) {
        toast.error('You already boosted this poll');
        return false;
      }

      // Add boost record
      const { error: boostError } = await supabase
        .from('user_boosts')
        .insert({
          user_id: user.id,
          poll_id: pollId,
          boosted_at: new Date().toISOString()
        });

      if (boostError) {
        console.error('Error boosting poll:', boostError);
        toast.error('Failed to boost poll');
        return false;
      }

      // Update daily limits
      const today = new Date().toISOString().split('T')[0];
      const { error: updateError } = await supabase
        .from('daily_boost_limits')
        .upsert({
          user_id: user.id,
          boost_date: today,
          boost_count: boostLimits.boostsUsed + 1,
          max_boosts: boostLimits.maxBoosts
        });

      if (updateError) {
        console.error('Error updating boost limits:', updateError);
      }

      // Update local state
      setBoostLimits(prev => ({
        ...prev,
        boostsUsed: prev.boostsUsed + 1,
        canBoost: prev.boostsUsed + 1 < prev.maxBoosts
      }));

      toast.success('Poll boosted!');
      return true;
    } catch (error) {
      console.error('Error in boostPoll:', error);
      toast.error('Failed to boost poll');
      return false;
    }
  }, [user, boostLimits]);

  return {
    boostLimits,
    fetchBoostLimits,
    boostPoll
  };
};