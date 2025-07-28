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
      // Temporarily disable database queries until types are updated
      console.log('Push system temporarily disabled - waiting for type regeneration');
      
      // Use local state only for now
      setPushLimits({
        pushCount: 0,
        maxPushes: 3,
        remainingPushes: 3,
        canPush: true
      });
      setPushedPolls([]);
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
      // Temporarily disable database operations until types are updated
      console.log('Push functionality temporarily disabled - waiting for type regeneration');
      
      // Simulate local push for now
      if (pushedPolls.includes(pollId)) {
        console.log('Poll already pushed by this user');
        return false;
      }

      // Update local state only
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
        description: "Poll pushed! 🚀 (Local mode)",
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