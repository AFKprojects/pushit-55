
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useGeolocation } from './useGeolocation';

export const useButtonHolds = () => {
  const [activeHolders, setActiveHolders] = useState(0);
  const [currentHoldId, setCurrentHoldId] = useState<string | null>(null);
  const [heartbeatInterval, setHeartbeatInterval] = useState<NodeJS.Timeout | null>(null);
  const { user } = useAuth();
  const { country } = useGeolocation();

  // Cleanup inactive sessions and get fresh count
  const cleanupInactiveSessions = async () => {
    const eightSecondsAgo = new Date(Date.now() - 8000).toISOString();
    console.log('Cleaning up sessions older than:', eightSecondsAgo);
    
    // First, let's see what's in the database
    const { data: allSessions, error: selectError } = await supabase
      .from('button_holds')
      .select('*');
    
    console.log('All sessions before cleanup:', allSessions);
    
    const { data: deletedRecords, error } = await supabase
      .from('button_holds')
      .delete()
      .lt('started_at', eightSecondsAgo)
      .select();

    if (error) {
      console.error('Cleanup error:', error);
    } else {
      console.log('Deleted old sessions:', deletedRecords?.length || 0, deletedRecords);
    }

    // Get fresh count after cleanup
    const { data: currentHolds, error: countError } = await supabase
      .from('button_holds')
      .select('*');
    
    if (!countError && currentHolds) {
      console.log('Active sessions after cleanup:', currentHolds.length, currentHolds);
      setActiveHolders(currentHolds.length);
    }
  };

  useEffect(() => {
    if (!user) {
      setActiveHolders(0);
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        setHeartbeatInterval(null);
      }
      return;
    }

    // Initial cleanup and count
    cleanupInactiveSessions();

    // Set up real-time subscription for changes
    const channel = supabase
      .channel('button-holds-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'button_holds'
      }, () => {
        // Just refresh count after any change
        cleanupInactiveSessions();
      })
      .subscribe();

    // Periodic cleanup every 3 seconds
    const cleanupInterval = setInterval(cleanupInactiveSessions, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(cleanupInterval);
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
    };
  }, [user, heartbeatInterval]);

  const startHold = async () => {
    if (!user) return;

    try {
      console.log('Starting hold for user:', user.id);
      
      // Auto-cleanup before starting new session
      await cleanupInactiveSessions();
      
      // Remove any existing session for this user
      await supabase
        .from('button_holds')
        .delete()
        .eq('user_id', user.id);

      // Insert new session
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
        
        // Start heartbeat by periodically updating started_at to keep session fresh
        const interval = setInterval(async () => {
          await supabase
            .from('button_holds')
            .update({ started_at: new Date().toISOString() })
            .eq('id', data.id);
        }, 3000); // Update every 3 seconds
        
        setHeartbeatInterval(interval);
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
      
      // Stop heartbeat
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        setHeartbeatInterval(null);
      }
      
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
