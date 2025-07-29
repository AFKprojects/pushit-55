import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useGeolocation } from './useGeolocation';

interface VoteHoldSession {
  id: string;
  pollId: string;
  optionId: string;
  isActive: boolean;
  deviceId: string;
}

export const useVoteHoldManager = () => {
  const [currentSession, setCurrentSession] = useState<VoteHoldSession | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const [activeHoldCount, setActiveHoldCount] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const { user } = useAuth();
  const { country } = useGeolocation();
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);

  // Generate device ID
  const getDeviceId = useCallback(() => {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }, []);

  // Fetch total active holds (main button + poll votes)
  const fetchActiveHoldCount = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('button_holds')
        .select('id')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching active holds:', error);
        return;
      }

      setActiveHoldCount(data?.length || 0);
    } catch (error) {
      console.error('Error in fetchActiveHoldCount:', error);
    }
  }, []);

  // Send heartbeat for current session
  const sendHeartbeat = useCallback(async () => {
    if (!currentSession) return;

    try {
      await supabase
        .from('button_holds')
        .update({ last_heartbeat: new Date().toISOString() })
        .eq('id', currentSession.id);
    } catch (error) {
      console.error('Error sending heartbeat:', error);
    }
  }, [currentSession]);

  // Start vote hold session
  const startVoteHold = useCallback(async (pollId: string, optionId: string) => {
    if (isHolding || !user) return null;

    try {
      const deviceId = getDeviceId();
      
      const { data, error } = await supabase
        .from('button_holds')
        .insert({
          user_id: user.id,
          device_id: deviceId,
          country,
          context_type: 'poll_option',
          context_id: optionId,
          is_active: true,
          started_at: new Date().toISOString(),
          last_heartbeat: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error starting vote hold:', error);
        return null;
      }

      const session: VoteHoldSession = {
        id: data.id,
        pollId,
        optionId,
        isActive: true,
        deviceId
      };

      setCurrentSession(session);
      setIsHolding(true);
      setCountdown(3);

      // Start countdown
      countdownInterval.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            // Countdown finished, start showing active holds
            fetchActiveHoldCount();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Start heartbeat
      heartbeatInterval.current = setInterval(sendHeartbeat, 3000);

      return session;
    } catch (error) {
      console.error('Error in startVoteHold:', error);
      return null;
    }
  }, [isHolding, user, country, getDeviceId, sendHeartbeat, fetchActiveHoldCount]);

  // End vote hold session and record vote
  const endVoteHold = useCallback(async (recordVote: boolean = true) => {
    if (!currentSession || !user) return;

    try {
      // Clear intervals
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
        countdownInterval.current = null;
      }

      // Mark session as inactive
      await supabase
        .from('button_holds')
        .update({
          is_active: false,
          ended_at: new Date().toISOString()
        })
        .eq('id', currentSession.id);

      // Record vote if countdown finished and user wants to vote
      if (recordVote && countdown === 0) {
        const { error: voteError } = await supabase
          .from('user_votes')
          .upsert({
            user_id: user.id,
            poll_id: currentSession.pollId,
            option_id: currentSession.optionId,
            voted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (voteError) {
          console.error('Error recording vote:', voteError);
        }
      }

      setCurrentSession(null);
      setIsHolding(false);
      setCountdown(0);
      setActiveHoldCount(0);
    } catch (error) {
      console.error('Error in endVoteHold:', error);
    }
  }, [currentSession, user, countdown]);

  // Listen for real-time updates
  useEffect(() => {
    if (!isHolding) return;

    const channel = supabase
      .channel('active-holds')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'button_holds',
          filter: 'is_active=eq.true'
        },
        () => {
          if (countdown === 0) {
            fetchActiveHoldCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isHolding, countdown, fetchActiveHoldCount]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
    };
  }, []);

  return {
    startVoteHold,
    endVoteHold,
    isHolding,
    countdown,
    activeHoldCount,
    currentSession
  };
};