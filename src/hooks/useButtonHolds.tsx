
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useGeolocation } from './useGeolocation';

export const useButtonHolds = () => {
  const [activeHolders, setActiveHolders] = useState(0);
  const [currentHoldId, setCurrentHoldId] = useState<string | null>(null);
  const { user } = useAuth();
  const { country } = useGeolocation();

  useEffect(() => {
    if (!user) {
      setActiveHolders(0);
      return;
    }

    // Cleanup old inactive holds and fetch current active count
    const fetchActiveHolds = async () => {
      // First cleanup holds older than 30 seconds that are still marked as active
      const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
      await supabase
        .from('button_holds')
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq('is_active', true)
        .lt('created_at', thirtySecondsAgo);

      // Then get current active holds count
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

    // Set up periodic cleanup every 10 seconds
    const cleanupInterval = setInterval(fetchActiveHolds, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(cleanupInterval);
    };
  }, [user]);

  const startHold = async () => {
    if (!user) return;

    try {
      console.log('Starting hold for user:', user.id);
      
      // Immediately increment local counter for instant feedback
      setActiveHolders(prev => prev + 1);
      
      // First, cleanup any existing active holds for this user
      await supabase
        .from('button_holds')
        .update({
          ended_at: new Date().toISOString(),
          is_active: false
        })
        .eq('user_id', user.id)
        .eq('is_active', true);

      const { data, error } = await supabase
        .from('button_holds')
        .insert({
          user_id: user.id,
          is_active: true,
          country: country || 'Unknown'
        })
        .select()
        .single();

      if (!error && data) {
        console.log('Hold started with ID:', data.id);
        setCurrentHoldId(data.id);
      } else {
        console.error('Error starting hold:', error);
        // Revert local increment if database operation failed
        setActiveHolders(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error starting hold:', error);
      // Revert local increment if operation failed
      setActiveHolders(prev => Math.max(0, prev - 1));
    }
  };

  const endHold = async () => {
    if (!user || !currentHoldId) return;

    try {
      console.log('Ending hold:', currentHoldId);
      
      // Immediately decrement local counter for instant feedback
      setActiveHolders(prev => Math.max(0, prev - 1));
      
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
        // Revert local decrement if database operation failed
        setActiveHolders(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error ending hold:', error);
      // Revert local decrement if operation failed
      setActiveHolders(prev => prev + 1);
    }
  };

  return {
    activeHolders,
    startHold,
    endHold
  };
};
