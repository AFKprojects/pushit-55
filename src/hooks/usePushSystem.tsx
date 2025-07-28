import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface PushLimits {
  pushCount: number;
  maxPushes: number;
  remainingPushes: number;
  canPush: boolean;
}

// Database tables for push system:
// user_pushes: user_id (uuid), poll_id (uuid), pushed_at (timestamp)
// daily_push_limits: user_id (uuid), push_date (date), push_count (int), max_pushes (int)

export const usePushSystem = () => {
  const [pushLimits, setPushLimits] = useState<PushLimits>({
    pushCount: 0,
    maxPushes: 3,
    remainingPushes: 3,
    canPush: true
  });
  const [pushedPolls, setPushedPolls] = useState<string[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  // Get current date string for daily reset
  const getCurrentDateString = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Load data from database
  const loadPushData = async () => {
    if (!user) {
      // Reset to defaults for logged out users
      setPushLimits({
        pushCount: 0,
        maxPushes: 3,
        remainingPushes: 3,
        canPush: true
      });
      setPushedPolls([]);
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Load daily push limits from database
      const { data: limitsData, error: limitsError } = await supabase
        .from('daily_push_limits')
        .select('*')
        .eq('user_id', user.id)
        .eq('push_date', today)
        .single();

      let pushCount = 0;
      const maxPushes = 3;

      if (limitsError && limitsError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error loading push limits:', limitsError);
      } else if (limitsData) {
        pushCount = limitsData.push_count;
      }

      // Load pushed polls for today
      const { data: pushedData, error: pushedError } = await supabase
        .from('user_pushes')
        .select('poll_id')
        .eq('user_id', user.id)
        .gte('pushed_at', today + 'T00:00:00Z')
        .lt('pushed_at', today + 'T23:59:59Z');

      if (pushedError) {
        console.error('Error loading pushed polls:', pushedError);
      }

      const pushedPollIds = pushedData?.map(p => p.poll_id) || [];

      const limits = {
        pushCount,
        maxPushes,
        remainingPushes: maxPushes - pushCount,
        canPush: pushCount < maxPushes
      };

      setPushLimits(limits);
      setPushedPolls(pushedPollIds);
    } catch (error) {
      console.error('Error loading push data:', error);
      // Fallback to defaults
      setPushLimits({
        pushCount: 0,
        maxPushes: 3,
        remainingPushes: 3,
        canPush: true
      });
      setPushedPolls([]);
    }
  };

  // Push a poll
  const pushPoll = async (pollId: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to push polls",
        variant: "destructive",
      });
      return false;
    }

    if (!pushLimits.canPush) {
      toast({
        title: "Push limit reached",
        description: `You can only push ${pushLimits.maxPushes} polls per day`,
        variant: "destructive",
      });
      return false;
    }

    if (pushedPolls.includes(pollId)) {
      toast({
        title: "Already pushed",
        description: "You have already pushed this poll",
        variant: "destructive",
      });
      return false;
    }

    try {
      // Check if already pushed this poll
      if (pushedPolls.includes(pollId)) {
        console.log('Poll already pushed by this user');
        return false;
      }

      // Insert into user_pushes table (this will trigger cache update via database triggers)
      const { error: pushError } = await supabase
        .from('user_pushes')
        .insert({
          user_id: user.id,
          poll_id: pollId
        });

      if (pushError) {
        console.error('Error inserting user push:', pushError);
        toast({
          title: "Error",
          description: "Failed to push poll",
          variant: "destructive",
        });
        return false;
      }

      // Update or insert daily push limits
      const today = new Date().toISOString().split('T')[0];
      const { error: limitError } = await supabase
        .from('daily_push_limits')
        .upsert({
          user_id: user.id,
          push_date: today,
          push_count: pushLimits.pushCount + 1,
          max_pushes: pushLimits.maxPushes
        });

      if (limitError) {
        console.error('Error updating push limits:', limitError);
        return false;
      }

      // Update local state
      const newPushCount = pushLimits.pushCount + 1;
      const updatedLimits = {
        ...pushLimits,
        pushCount: newPushCount,
        remainingPushes: pushLimits.maxPushes - newPushCount,
        canPush: newPushCount < pushLimits.maxPushes
      };

      setPushLimits(updatedLimits);
      
      // Add to pushed polls list
      const updatedPushedPolls = [...pushedPolls, pollId];
      setPushedPolls(updatedPushedPolls);

      toast({
        title: "Success",
        description: "Poll pushed! 🚀",
      });

      return true;
    } catch (error: any) {
      console.error('Error pushing poll:', error);
      toast({
        title: "Error",
        description: "Failed to push poll",
        variant: "destructive",
      });
      return false;
    }
  };

  // Check if user has pushed a specific poll
  const hasPushedPoll = (pollId: string): boolean => {
    return pushedPolls.includes(pollId);
  };

  // Check if user can push a specific poll
  const canPushPoll = (pollId: string, hasVoted: boolean): boolean => {
    return hasVoted && pushLimits.canPush && !hasPushedPoll(pollId);
  };

  useEffect(() => {
    if (user) {
      loadPushData();
    } else {
      // Reset state when user logs out
      setPushLimits({
        pushCount: 0,
        maxPushes: 3,
        remainingPushes: 3,
        canPush: true
      });
      setPushedPolls([]);
    }
  }, [user]);

  return {
    pushLimits,
    pushPoll,
    hasPushedPoll,
    canPushPoll,
    refetchPushData: loadPushData
  };
};