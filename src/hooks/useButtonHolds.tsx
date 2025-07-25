
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

  // ULTIMATE NUCLEAR CLEANUP - delete ALL sessions by selecting all and deleting
  const forceCleanupOldSessions = async () => {
    console.log('💣 ULTIMATE NUCLEAR CLEANUP - deleting ALL sessions');
    
    // First get all sessions
    const { data: allSessions } = await supabase
      .from('button_holds')
      .select('id');
    
    if (allSessions && allSessions.length > 0) {
      // Delete each session by ID
      for (const session of allSessions) {
        const { error } = await supabase
          .from('button_holds')
          .delete()
          .eq('id', session.id);
        
        if (!error) {
          console.log('💣 Deleted session:', session.id);
        }
      }
      console.log('💣 NUCLEAR CLEANUP deleted ALL sessions:', allSessions.length);
    } else {
      console.log('💣 No sessions to delete');
    }
  };

  // Regular cleanup - delete by started_at since last_heartbeat has TypeScript issues
  const cleanupInactiveSessions = async () => {
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
    console.log('🔄 Running cleanup - checking sessions older than:', tenSecondsAgo);
    
    // First check what sessions exist
    const { data: allSessions, error: checkError } = await supabase
      .from('button_holds')
      .select('*');
    
    console.log('All current sessions:', allSessions);
    
    const { data: deleted, error } = await supabase
      .from('button_holds')
      .delete()
      .lt('started_at', tenSecondsAgo)
      .select();

    if (error) {
      console.error('Cleanup error:', error);
    } else {
      console.log('Cleanup deleted inactive sessions:', deleted?.length || 0);
    }

    // Get fresh count - ALWAYS update UI state
    const { data: currentHolds, error: countError } = await supabase
      .from('button_holds')
      .select('*');
    
    console.log('📊 Current active sessions:', currentHolds?.length || 0);
    
    if (!countError && currentHolds) {
      setActiveHolders(currentHolds.length);
      console.log('📊 Updated UI activeHolders to:', currentHolds.length);
    }
  };

  // Send heartbeat - update started_at since last_heartbeat has TypeScript issues  
  const sendHeartbeat = async () => {
    if (!currentHoldId) return;

    console.log('Sending heartbeat for session:', currentHoldId);
    const { error, data } = await supabase
      .from('button_holds')
      .update({ started_at: new Date().toISOString() })
      .eq('id', currentHoldId)
      .select();

    if (error) {
      console.error('Heartbeat error:', error);
    } else {
      console.log('Heartbeat sent successfully:', data);
    }
  };

  useEffect(() => {
    if (!user) {
      setActiveHolders(0);
      return;
    }

    // Initial force cleanup and count
    forceCleanupOldSessions().then(() => cleanupInactiveSessions());

    // Set up real-time subscription for changes - NO CLEANUP HERE AT ALL
    const channel = supabase
      .channel('button-holds-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'button_holds'
      }, () => {
        // Only refresh the count, NO cleanup during real-time updates
        console.log('🔄 Real-time change detected, refreshing count only');
        supabase
          .from('button_holds')
          .select('*')
          .then(({ data, error }) => {
            if (!error && data) {
              console.log('📊 Real-time count update:', data.length);
              setActiveHolders(data.length);
            }
          });
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
