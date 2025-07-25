import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useGeolocation } from './useGeolocation';

interface SessionData {
  id: string;
  user_id: string;
  started_at: string;
  country: string;
  is_active: boolean;
}

export const useSessionManager = () => {
  const [activeSessions, setActiveSessions] = useState<SessionData[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  
  const { user } = useAuth();
  const { country } = useGeolocation();
  
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const cleanupInterval = useRef<NodeJS.Timeout | null>(null);

  // Fetch current active sessions
  const fetchActiveSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('button_holds')
        .select('*')
        .eq('is_active', true);
      
      if (!error && data) {
        setActiveSessions(data as SessionData[]);
        console.log('📊 Active sessions fetched:', data.length);
      } else {
        console.error('Error fetching sessions:', error);
      }
    } catch (error) {
      console.error('Error in fetchActiveSessions:', error);
    }
  }, []);

  // Clean up inactive sessions - much more aggressive cleanup
  const cleanupInactiveSessions = useCallback(async () => {
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
    
    try {
      console.log('🧹 Starting cleanup of sessions older than:', tenSecondsAgo);
      
      // Get all sessions to see what we're cleaning
      const { data: allSessions } = await supabase
        .from('button_holds')
        .select('*');
      
      console.log('🧹 All sessions before cleanup:', allSessions);
      
      // Delete old sessions
      const { data: deleted, error } = await supabase
        .from('button_holds')
        .delete()
        .lt('started_at', tenSecondsAgo)
        .select();
      
      if (error) {
        console.error('Cleanup error:', error);
      } else {
        console.log('🧹 Cleaned up sessions:', deleted?.length || 0);
      }
      
      // Refresh sessions after cleanup
      await fetchActiveSessions();
    } catch (error) {
      console.error('Error in cleanup:', error);
    }
  }, [fetchActiveSessions]);

  // Send heartbeat for current session - update started_at to keep it alive
  const sendHeartbeat = useCallback(async () => {
    if (!currentSessionId) return;

    try {
      console.log('💓 Sending heartbeat for session:', currentSessionId);
      
      const { error } = await supabase
        .from('button_holds')
        .update({ started_at: new Date().toISOString() })
        .eq('id', currentSessionId);
      
      if (error) {
        console.error('Heartbeat error:', error);
      } else {
        console.log('💓 Heartbeat sent successfully');
      }
    } catch (error) {
      console.error('Error sending heartbeat:', error);
    }
  }, [currentSessionId]);

  // Start a new session
  const startSession = useCallback(async () => {
    if (!user || isHolding) return;

    try {
      console.log('🚀 Starting new session for user:', user.id);
      
      // Remove any existing sessions for this user first
      await supabase
        .from('button_holds')
        .delete()
        .eq('user_id', user.id);

      // Create new session
      const { data, error } = await supabase
        .from('button_holds')
        .insert({
          user_id: user.id,
          is_active: true,
          country: country || 'Unknown',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (!error && data) {
        console.log('✅ Session created:', data.id);
        setCurrentSessionId(data.id);
        setIsHolding(true);
        
        // Start heartbeat every 3 seconds (aggressive)
        heartbeatInterval.current = setInterval(sendHeartbeat, 3000);
        
        // Immediate refresh of sessions
        await fetchActiveSessions();
      } else {
        console.error('Error creating session:', error);
      }
    } catch (error) {
      console.error('Error starting session:', error);
    }
  }, [user, country, isHolding, sendHeartbeat, fetchActiveSessions]);

  // End current session
  const endSession = useCallback(async () => {
    if (!currentSessionId) return;

    try {
      console.log('🛑 Ending session:', currentSessionId);
      
      // Stop heartbeat immediately
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }

      // Delete session
      await supabase
        .from('button_holds')
        .delete()
        .eq('id', currentSessionId);

      setCurrentSessionId(null);
      setIsHolding(false);
      
      console.log('✅ Session ended successfully');
      
      // Immediate refresh of sessions
      await fetchActiveSessions();
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }, [currentSessionId, fetchActiveSessions]);

  // Initialize and setup
  useEffect(() => {
    if (!user) {
      setActiveSessions([]);
      setCurrentSessionId(null);
      setIsHolding(false);
      return;
    }

    console.log('🔧 Initializing session manager for user:', user.id);

    // Initial fetch
    fetchActiveSessions();

    // Setup cleanup interval (every 5 seconds - aggressive)
    cleanupInterval.current = setInterval(cleanupInactiveSessions, 5000);

    // Setup real-time subscription
    const channel = supabase
      .channel('session-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'button_holds'
      }, () => {
        console.log('🔄 Real-time change detected, refreshing sessions');
        fetchActiveSessions();
      })
      .subscribe();

    return () => {
      // Cleanup intervals
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      if (cleanupInterval.current) {
        clearInterval(cleanupInterval.current);
      }
      
      // Cleanup subscription
      supabase.removeChannel(channel);
      console.log('🧹 Session manager cleaned up');
    };
  }, [user, fetchActiveSessions, cleanupInactiveSessions]);

  // Auto-cleanup on unmount/page leave
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentSessionId) {
        // Quick sync delete on page leave
        navigator.sendBeacon('/api/cleanup-session', JSON.stringify({ sessionId: currentSessionId }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (currentSessionId) {
        endSession();
      }
    };
  }, [currentSessionId, endSession]);

  return {
    activeSessions,
    activeSessionCount: activeSessions.length,
    isHolding,
    startSession,
    endSession
  };
};