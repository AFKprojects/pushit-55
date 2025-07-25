import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useGeolocation } from './useGeolocation';

interface SessionData {
  id: string;
  user_id: string;
  device_id?: string;
  started_at: string;
  last_heartbeat?: string;
  country?: string;
  is_active: boolean;
  duration_seconds?: number;
  ended_at?: string;
}

// Generate device fingerprint for session management
const getDeviceId = () => {
  if (typeof window === 'undefined') return 'server';
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx?.fillText('fingerprint', 10, 10);
  
  return btoa(
    navigator.userAgent + 
    canvas.toDataURL() + 
    (navigator.hardwareConcurrency || 0) +
    (screen.width + screen.height)
  ).slice(0, 32);
};

export const useSessionManager = () => {
  const [activeSessions, setActiveSessions] = useState<SessionData[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  
  const { user } = useAuth();
  const { country } = useGeolocation();
  
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const cleanupInterval = useRef<NodeJS.Timeout | null>(null);
  const deviceId = useRef<string>(getDeviceId());

  // Fetch current active sessions using last_heartbeat
  const fetchActiveSessions = useCallback(async () => {
    try {
      const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
      
      const { data, error } = await supabase
        .from('button_holds')
        .select('*')
        .eq('is_active', true)
        .gt('last_heartbeat' as any, tenSecondsAgo);
      
      if (!error && data) {
        setActiveSessions(data as SessionData[]);
        console.log('📊 Active sessions fetched:', data.length, 'newer than', tenSecondsAgo);
      } else {
        console.error('Error fetching sessions:', error);
      }
    } catch (error) {
      console.error('Error in fetchActiveSessions:', error);
    }
  }, []);

  // Clean up inactive sessions using last_heartbeat
  const cleanupInactiveSessions = useCallback(async () => {
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
    
    try {
      console.log('🧹 Starting cleanup of sessions with last_heartbeat older than:', tenSecondsAgo);
      
      // Get sessions before cleanup for logging
      const { data: beforeCleanup } = await supabase
        .from('button_holds')
        .select('*');
      
      console.log('🧹 Sessions before cleanup:', beforeCleanup?.length);
      
      // Delete sessions with old last_heartbeat
      const { data: deleted, error } = await supabase
        .from('button_holds')
        .delete()
        .lt('last_heartbeat' as any, tenSecondsAgo)
        .select('*');
      
      if (error) {
        console.error('Cleanup error:', error);
      } else {
        console.log('🧹 Cleanup completed - deleted sessions:', deleted?.length || 0);
        if (deleted?.length) {
          console.log('🧹 Deleted sessions details:', deleted);
        }
      }
      
      // Refresh sessions after cleanup
      await fetchActiveSessions();
    } catch (error) {
      console.error('Error in cleanup:', error);
    }
  }, [fetchActiveSessions]);

  // Send heartbeat for current session - update last_heartbeat to keep it alive
  const sendHeartbeat = useCallback(async () => {
    if (!currentSessionId) return;

    try {
      const heartbeatTime = new Date().toISOString();
      console.log('💓 Sending heartbeat for session:', currentSessionId, 'at', heartbeatTime);
      
      const { error } = await supabase
        .from('button_holds')
        .update({ last_heartbeat: heartbeatTime } as any)
        .eq('id', currentSessionId);
      
      if (error) {
        console.error('💓 Heartbeat failed:', error);
      } else {
        console.log('✅ Heartbeat sent successfully at', heartbeatTime);
      }
    } catch (error) {
      console.error('Error sending heartbeat:', error);
    }
  }, [currentSessionId]);

  // Start a new session
  const startSession = useCallback(async () => {
    if (!user || isHolding) return;

    try {
      console.log('🚀 Starting new session for user:', user.id, 'device:', deviceId.current);
      
      // Remove any existing sessions for this user first
      await supabase
        .from('button_holds')
        .delete()
        .eq('user_id', user.id);

      const now = new Date().toISOString();
      
      // Create new session with device_id and proper heartbeat
      const { data, error } = await supabase
        .from('button_holds')
        .insert({
          user_id: user.id,
          device_id: deviceId.current,
          is_active: true,
          started_at: now,
          last_heartbeat: now,
          country: country
        } as any)
        .select()
        .single();

      if (!error && data) {
        console.log('✅ Session created:', data.id, 'started at:', now);
        setCurrentSessionId(data.id);
        setIsHolding(true);
        
        // Start heartbeat every 3 seconds
        heartbeatInterval.current = setInterval(sendHeartbeat, 3000);
        
        // Immediate refresh of sessions
        await fetchActiveSessions();
      } else {
        console.error('❌ Error creating session:', error);
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
      const { error } = await supabase
        .from('button_holds')
        .delete()
        .eq('id', currentSessionId);

      if (error) {
        console.error('❌ Error deleting session:', error);
      } else {
        console.log('✅ Session ended successfully:', currentSessionId);
      }

      setCurrentSessionId(null);
      setIsHolding(false);
      
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

    // Setup cleanup interval (every 5 seconds with 10-second buffer)
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