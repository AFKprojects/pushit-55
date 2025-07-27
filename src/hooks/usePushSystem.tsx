import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface PushLimits {
  pushCount: number;
  maxPushes: number;
  remainingPushes: number;
  canPush: boolean;
}

const PUSH_STORAGE_KEY = 'poll_pushes';
const PUSH_LIMITS_KEY = 'push_limits';

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

  // Load data from localStorage
  const loadPushData = () => {
    if (!user) return;

    try {
      const currentDate = getCurrentDateString();
      
      // Load push limits
      const storedLimits = localStorage.getItem(`${PUSH_LIMITS_KEY}_${user.id}`);
      let pushCount = 0;
      
      if (storedLimits) {
        const limits = JSON.parse(storedLimits);
        // Reset if it's a new day
        if (limits.date === currentDate) {
          pushCount = limits.count || 0;
        } else {
          // New day, reset to 0
          localStorage.setItem(`${PUSH_LIMITS_KEY}_${user.id}`, JSON.stringify({
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
      const storedPushes = localStorage.getItem(`${PUSH_STORAGE_KEY}_${user.id}`);
      if (storedPushes) {
        const pushData = JSON.parse(storedPushes);
        if (pushData.date === currentDate) {
          setPushedPolls(new Set(pushData.polls || []));
        } else {
          // New day, clear pushed polls
          localStorage.setItem(`${PUSH_STORAGE_KEY}_${user.id}`, JSON.stringify({
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
      const newPushCount = pushLimits.pushCount + 1;
      const newRemainingPushes = Math.max(0, pushLimits.maxPushes - newPushCount);
      
      // Update localStorage
      localStorage.setItem(`${PUSH_LIMITS_KEY}_${user.id}`, JSON.stringify({
        count: newPushCount,
        date: currentDate
      }));

      const newPushedPolls = new Set([...pushedPolls, pollId]);
      localStorage.setItem(`${PUSH_STORAGE_KEY}_${user.id}`, JSON.stringify({
        polls: Array.from(newPushedPolls),
        date: currentDate
      }));

      // Update local state
      setPushLimits({
        ...pushLimits,
        pushCount: newPushCount,
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