
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

  // Force cleanup all sessions older than 1 minute (app startup)
  const forceCleanupOldSessions = async () => {
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    
    const { data: deleted, error } = await supabase
      .from('button_holds')
      .delete()
      .lt('last_heartbeat', oneMinuteAgo)
      .select();

    if (error) {
      console.error('Force cleanup error:', error);
    } else {
      console.log('Force cleanup deleted old sessions:', deleted?.length || 0);
    }
  };

  // Regular cleanup - sessions without heartbeat for 10+ seconds
  const cleanupInactiveSessions = async () => {
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
    
    const { data: deleted, error } = await supabase
      .from('button_holds')
      .delete()
      .lt('last_heartbeat', tenSecondsAgo)
      .select();

    if (error) {
      console.error('Cleanup error:', error);
    } else {
      console.log('Cleanup deleted inactive sessions:', deleted?.length || 0);
    }

    // Get fresh count
    const { data: currentHolds, error: countError } = await supabase
      .from('button_holds')
      .select('*');
    
    if (!countError && currentHolds) {
      setActiveHolders(currentHolds.length);
    }
  };

  // Send heartbeat to keep session alive
  const sendHeartbeat = async () => {
    if (!currentHoldId) return;

    const { error } = await supabase
      .from('button_holds')
      .update({ last_heartbeat: new Date().toISOString() })
      .eq('id', currentHoldId);

    if (error) {
      console.error('Heartbeat error:', error);
    }
  };

  useEffect(() => {
    if (!user) {
      setActiveHolders(0);
      return;
    }

    // Initial force cleanup and count
    forceCleanupOldSessions().then(() => cleanupInactiveSessions());

    // Set up real-time subscription for changes
    const channel = supabase
      .channel('button-holds-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'button_holds'
      }, () => {
        cleanupInactiveSessions();
      })
      .subscribe();

    // Periodic cleanup every 5 seconds
    const cleanupInterval = setInterval(cleanupInactiveSessions, 5000);

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
      
      // Remove any existing sessions for this user (prevent multiple sessions)
      const { data: deletedUserSessions, error: deleteError } = await supabase
        .from('button_holds')
        .delete()
        .eq('user_id', user.id)
        .select();

      if (deleteError) {
        console.error('Error deleting user sessions:', deleteError);
      } else {
        console.log('Deleted existing user sessions:', deletedUserSessions?.length || 0);
      }

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
        
        // Start heartbeat every 3 seconds
        const interval = setInterval(sendHeartbeat, 3000);
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
