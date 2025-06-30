
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ButtonHold {
  id: string;
  user_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  is_active: boolean;
}

interface ActiveHold {
  id: string;
  startTime: number;
  userId?: string;
}

export const useButtonHolds = () => {
  const [activeHolds, setActiveHolds] = useState<ActiveHold[]>([]);
  const [totalActiveHolds, setTotalActiveHolds] = useState(0);
  const [currentHold, setCurrentHold] = useState<string | null>(null);
  const { user } = useAuth();
  const holdStartTime = useRef<number | null>(null);

  const startHold = async () => {
    if (currentHold) return currentHold;

    const startTime = Date.now();
    holdStartTime.current = startTime;

    try {
      const { data, error } = await supabase
        .from('button_holds')
        .insert({
          user_id: user?.id || null,
          started_at: new Date().toISOString(),
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentHold(data.id);
      return data.id;
    } catch (error) {
      console.error('Error starting hold:', error);
      return null;
    }
  };

  const endHold = async (holdId: string) => {
    if (!holdStartTime.current) return;

    const endTime = Date.now();
    const duration = Math.round((endTime - holdStartTime.current) / 1000);

    try {
      const { error } = await supabase
        .from('button_holds')
        .update({
          ended_at: new Date().toISOString(),
          duration_seconds: duration,
          is_active: false
        })
        .eq('id', holdId);

      if (error) throw error;

      setCurrentHold(null);
      holdStartTime.current = null;
    } catch (error) {
      console.error('Error ending hold:', error);
    }
  };

  const fetchActiveHolds = async () => {
    try {
      const { data, error } = await supabase
        .from('button_holds')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      const holds = (data || []).map(hold => ({
        id: hold.id,
        startTime: new Date(hold.started_at).getTime(),
        userId: hold.user_id
      }));

      setActiveHolds(holds);
      setTotalActiveHolds(holds.length);
    } catch (error) {
      console.error('Error fetching active holds:', error);
    }
  };

  useEffect(() => {
    fetchActiveHolds();

    // Set up real-time subscription
    const channel = supabase
      .channel('button-holds-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'button_holds'
      }, (payload) => {
        console.log('Button hold change:', payload);
        fetchActiveHolds();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    activeHolds,
    totalActiveHolds,
    currentHold,
    startHold,
    endHold
  };
};
