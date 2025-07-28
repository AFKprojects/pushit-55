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
      const currentDate = getCurrentDateString();

      // Get current daily push limits
      const { data: dailyLimits, error: limitsError } = await supabase
        .from('daily_push_limits')
        .select('push_count, max_pushes')
        .eq('user_id', user.id)
        .eq('push_date', currentDate)
        .single();

      if (limitsError && limitsError.code !== 'PGRST116') {
        console.error('Error fetching daily limits:', limitsError);
        throw limitsError;
      }

      // Get user's pushed polls for today
      const { data: userPushes, error: pushesError } = await supabase
        .from('user_pushes')
        .select('poll_id')
        .eq('user_id', user.id)
        .gte('pushed_at', currentDate + 'T00:00:00');

      if (pushesError) {
        console.error('Error fetching user pushes:', pushesError);
        throw pushesError;
      }

      const currentPushCount = dailyLimits?.push_count || 0;
      const maxPushes = dailyLimits?.max_pushes || 3;
      const pushedPollIds = userPushes?.map(p => p.poll_id) || [];

      setPushLimits({
        pushCount: currentPushCount,
        maxPushes,
        remainingPushes: maxPushes - currentPushCount,
        canPush: currentPushCount < maxPushes
      });
      
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
      const currentDate = getCurrentDateString();

      // Check if user already pushed this poll
      const { data: existingPush, error: checkError } = await supabase
        .from('user_pushes')
        .select('id')
        .eq('user_id', user.id)
        .eq('poll_id', pollId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing push:', checkError);
        throw checkError;
      }

      if (existingPush) {
        console.log('Poll already pushed by this user');
        return false;
      }

      // Insert the push record
      const { error: pushError } = await supabase
        .from('user_pushes')
        .insert({
          user_id: user.id,
          poll_id: pollId,
          pushed_at: new Date().toISOString()
        });

      if (pushError) {
        console.error('Error inserting push:', pushError);
        throw pushError;
      }

      // Update or create daily push limits
      const { data: dailyLimits, error: upsertError } = await supabase
        .from('daily_push_limits')
        .upsert({
          user_id: user.id,
          push_date: currentDate,
          push_count: pushLimits.pushCount + 1,
          max_pushes: pushLimits.maxPushes
        }, {
          onConflict: 'user_id,push_date'
        })
        .select()
        .single();

      if (upsertError) {
        console.error('Error updating daily limits:', upsertError);
        throw upsertError;
      }

      // Get current poll push count and increment it
      const { data: currentPoll, error: getPollError } = await supabase
        .from('polls')
        .select('push_count')
        .eq('id', pollId)
        .single();

      if (!getPollError && currentPoll) {
        const { error: pollUpdateError } = await supabase
          .from('polls')
          .update({ 
            push_count: (currentPoll.push_count || 0) + 1 
          })
          .eq('id', pollId);

        if (pollUpdateError) {
          console.error('Error updating poll push count:', pollUpdateError);
          // Don't throw here as the push was successful
        }
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