
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
        console.log('Active holds count:', data.length);
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
      }, (payload) => {
        console.log('Button holds change:', payload);
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
      console.log('Starting hold for user:', user.id);
      const { data, error } = await supabase
        .from('button_holds')
        .insert({
          user_id: user.id,
          is_active: true
        })
        .select()
        .single();

      if (!error && data) {
        console.log('Hold started with ID:', data.id);
        setCurrentHoldId(data.id);
      } else {
        console.error('Error starting hold:', error);
      }
    } catch (error) {
      console.error('Error starting hold:', error);
    }
  };

  const endHold = async () => {
    if (!user || !currentHoldId) return;

    try {
      console.log('Ending hold:', currentHoldId);
      const { error } = await supabase
        .from('button_holds')
        .update({
          ended_at: new Date().toISOString(),
          is_active: false
        })
        .eq('id', currentHoldId);

      if (!error) {
        console.log('Hold ended successfully');
        setCurrentHoldId(null);
      } else {
        console.error('Error ending hold:', error);
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
