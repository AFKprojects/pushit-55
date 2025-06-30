
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useButtonHolds = () => {
  const [activeHolders, setActiveHolders] = useState(0);
  const [currentHoldId, setCurrentHoldId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setActiveHolders(0);
      return;
    }

    // Fetch initial active holds count
    const fetchActiveHolds = async () => {
      const { data, error } = await supabase
        .from('button_holds')
        .select('id')
        .eq('is_active', true);
      
      if (!error && data) {
        setActiveHolders(data.length);
      }
    };

    fetchActiveHolds();

    // Set up real-time subscription
    const channel = supabase
      .channel('button-holds-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'button_holds'
      }, () => {
        fetchActiveHolds();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const startHold = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('button_holds')
        .insert({
          user_id: user.id,
          is_active: true
        })
        .select()
        .single();

      if (!error && data) {
        setCurrentHoldId(data.id);
      }
    } catch (error) {
      console.error('Error starting hold:', error);
    }
  };

  const endHold = async () => {
    if (!user || !currentHoldId) return;

    try {
      const startTime = new Date();
      const { error } = await supabase
        .from('button_holds')
        .update({
          ended_at: new Date().toISOString(),
          is_active: false,
          duration_seconds: Math.floor((Date.now() - startTime.getTime()) / 1000)
        })
        .eq('id', currentHoldId);

      if (!error) {
        setCurrentHoldId(null);
      }
    } catch (error) {
      console.error('Error ending hold:', error);
    }
  };

  return {
    activeHolders,
    startHold,
    endHold
  };
};
