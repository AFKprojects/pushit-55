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

// Tables needed for push system:
// user_push_limits: user_id (uuid), push_count (int), push_date (date)
// poll_pushes: user_id (uuid), poll_id (uuid), pushed_at (timestamp)

export const usePushSystem = () => {
  const [pushLimits, setPushLimits] = useState<PushLimits>({
    pushCount: 0,
    maxPushes: 3,
    remainingPushes: 3,
    canPush: true
  });
  const [pushedPolls, setPushedPolls] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { toast } = useToast();

  // Get current date string for daily reset
  const getCurrentDateString = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Load data from database (fallback to localStorage for now)
  const loadPushData = async () => {
    if (!user) return;

    try {
      const currentDate = getCurrentDateString();
      
      // For now, use localStorage since the database tables may not exist yet
      // TODO: Replace with database queries when tables are created
      const storedLimits = localStorage.getItem(`push_limits_${user.id}`);
      let pushCount = 0;
      
      if (storedLimits) {
        const limits = JSON.parse(storedLimits);
        if (limits.date === currentDate) {
          pushCount = limits.count || 0;
        } else {
          localStorage.setItem(`push_limits_${user.id}`, JSON.stringify({
            count: 0,
            date: currentDate
          }));
        }
      }

      const maxPushes = 3;
      const remainingPushes = Math.max(0, maxPushes - pushCount);

      setPushLimits({
        pushCount,
        maxPushes,
        remainingPushes,
        canPush: remainingPushes > 0
      });

      // Load pushed polls for today
      const storedPushes = localStorage.getItem(`poll_pushes_${user.id}`);
      if (storedPushes) {
        const pushData = JSON.parse(storedPushes);
        if (pushData.date === currentDate) {
          setPushedPolls(new Set(pushData.polls || []));
        } else {
          localStorage.setItem(`poll_pushes_${user.id}`, JSON.stringify({
            polls: [],
            date: currentDate
          }));
          setPushedPolls(new Set());
        }
      }
    } catch (error) {
      console.error('Error loading push data:', error);
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

    if (pushedPolls.has(pollId)) {
      toast({
        title: "Already pushed",
        description: "You have already pushed this poll",
        variant: "destructive",
      });
      return false;
    }

    try {
      const currentDate = getCurrentDateString();
      const newUserPushCount = pushLimits.pushCount + 1;
      const newRemainingPushes = Math.max(0, pushLimits.maxPushes - newUserPushCount);
      
      // First get current push_count, then increment it
      const { data: currentPoll, error: fetchError } = await supabase
        .from('polls')
        .select('push_count')
        .eq('id', pollId)
        .single();

      if (!fetchError && currentPoll) {
        const newPollPushCount = (currentPoll.push_count || 0) + 1;
        const { error: updateError } = await supabase
          .from('polls')
          .update({ push_count: newPollPushCount })
          .eq('id', pollId);

        if (updateError) {
          console.error('Error updating poll push count:', updateError);
        }
      }

      // Update localStorage (fallback for user limits tracking)
      localStorage.setItem(`push_limits_${user.id}`, JSON.stringify({
        count: newUserPushCount,
        date: currentDate
      }));

      const newPushedPolls = new Set([...pushedPolls, pollId]);
      localStorage.setItem(`poll_pushes_${user.id}`, JSON.stringify({
        polls: Array.from(newPushedPolls),
        date: currentDate
      }));

      // Update local state
      setPushLimits({
        ...pushLimits,
        pushCount: newUserPushCount,
        remainingPushes: newRemainingPushes,
        canPush: newRemainingPushes > 0
      });

      setPushedPolls(newPushedPolls);

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
    return pushedPolls.has(pollId);
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
      setPushedPolls(new Set());
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