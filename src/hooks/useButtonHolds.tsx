
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

    // Cleanup old inactive holds and fetch initial active count
    const fetchActiveHolds = async () => {
      // Cleanup holds older than 30 seconds
      const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
      await supabase
        .from('button_holds')
        .delete()
        .lt('created_at', thirtySecondsAgo);

      // Get current active holds count
      const { data, error } = await supabase
        .from('button_holds')
        .select('id');
      
      if (!error && data) {
        console.log('Active holds count:', data.length);
        setActiveHolders(data.length);
      }
    };

    fetchActiveHolds();

    // Set up real-time subscription with event-based counter updates
    const channel = supabase
      .channel('button-holds-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'button_holds'
      }, (payload) => {
        console.log('Hold started:', payload);
        setActiveHolders(prev => prev + 1);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'button_holds'
      }, (payload) => {
        console.log('Hold ended:', payload);
        setActiveHolders(prev => Math.max(0, prev - 1));
      })
      .subscribe();

    // Set up periodic cleanup every 5 seconds
    const cleanupInterval = setInterval(async () => {
      const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
      await supabase
        .from('button_holds')
        .delete()
        .lt('created_at', thirtySecondsAgo);
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(cleanupInterval);
    };
  }, [user]);

  const startHold = async () => {
    if (!user) return;

    try {
      console.log('Starting hold for user:', user.id);
      
      // First, cleanup any existing holds for this user
      await supabase
        .from('button_holds')
        .delete()
        .eq('user_id', user.id);

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
        .delete()
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
