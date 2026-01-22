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

// Extended interface with all columns that actually exist in DB
interface DbSessionData {
  id: string;
  user_id: string;
  device_id: string | null;
  started_at: string | null;
  last_heartbeat: string | null;
  country: string | null;
  is_active: boolean | null;
  duration_seconds: number | null;
  ended_at: string | null;
}

// Generate cryptographically secure device ID for session management
const getDeviceId = () => {
  if (typeof window === 'undefined') return 'server';
  
  let deviceId = localStorage.getItem('secureDeviceId');
  if (!deviceId) {
    // Generate cryptographically secure device ID
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    deviceId = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('secureDeviceId', deviceId);
  }
  return deviceId;
};

export const useSessionManager = () => {
  const [activeSessions, setActiveSessions] = useState<SessionData[]>([]);
  const [currentSessionId, setCurrentSessionIdRaw] = useState<string | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  
  // Wrapper to log currentSessionId changes
  const setCurrentSessionId = (id: string | null) => {
    console.log('🆔 Setting currentSessionId:', currentSessionId, '->', id, 'Stack:', new Error().stack?.split('\n')[2]);
    setCurrentSessionIdRaw(id);
  };
  
  const { user } = useAuth();
  const { country } = useGeolocation();
  
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const cleanupInterval = useRef<NodeJS.Timeout | null>(null);
  const deviceId = useRef<string>(getDeviceId());

  // Fetch current active sessions using last_heartbeat (10s timeout)
  const fetchActiveSessions = useCallback(async () => {
    try {
      const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
      
      const { data, error } = await supabase
        .from('button_holds')
        .select('*')
        .eq('is_active', true)
        .gt('last_heartbeat', tenSecondsAgo);
      
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

  // Mark inactive sessions as ended (NOT delete) - preserves data for statistics
  const cleanupInactiveSessions = useCallback(async () => {
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
    const now = new Date().toISOString();
    
    try {
      console.log('🧹 Marking inactive sessions (last_heartbeat older than:', tenSecondsAgo, ')');
      
      // Update sessions to is_active=false and set ended_at (NOT delete!)
      const { data: updated, error } = await supabase
        .from('button_holds')
        .update({ 
          is_active: false,
          ended_at: now
        })
        .eq('is_active', true)
        .lt('last_heartbeat', tenSecondsAgo)
        .select('*');
      
      if (error) {
        console.error('Cleanup error:', error);
      } else {
        console.log('🧹 Cleanup completed - marked inactive:', updated?.length || 0);
        if (updated && updated.length > 0) {
          console.log('📦 Archived sessions:', updated.map(s => s.id));
          // Check if we archived our own session
          if (currentSessionId && updated.some(s => s.id === currentSessionId)) {
            console.log('🚨 WARNING: Cleanup archived our active session!', currentSessionId);
          }
        }
      }
      
      // Refresh sessions after cleanup
      await fetchActiveSessions();
    } catch (error) {
      console.error('Error in cleanup:', error);
    }
  }, [fetchActiveSessions, currentSessionId]);

  // Send heartbeat for current session - update last_heartbeat to keep it alive
  const sendHeartbeat = useCallback(async () => {
    if (!currentSessionId) {
      console.log('🫀 Heartbeat skipped - no current session');
      return;
    }

    try {
      const heartbeatTime = new Date().toISOString();
      console.log('🫀 Heartbeat starting for session:', currentSessionId, 'at', heartbeatTime);
      console.log('📥 Updating session heartbeat in database...');
      
      const { error, data } = await supabase
        .from('button_holds')
        .update({ last_heartbeat: heartbeatTime })
        .eq('id', currentSessionId)
        .select();
      
      if (error) {
        console.error('❌ Heartbeat database update failed:', error);
      } else {
        console.log('✅ Heartbeat database update successful:', data);
        console.log('🫀 Session heartbeat updated to:', heartbeatTime);
      }
    } catch (error) {
      console.error('💥 Heartbeat exception:', error);
    }
  }, [currentSessionId]);

  // Start a new session
  const startSession = useCallback(async () => {
    if (!user || isHolding) return;

    try {
      console.log('🚀 Starting new session for user:', user.id, 'device:', deviceId.current);
      console.log('🌍 Country from geolocation:', country);
      
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
          country: country || 'Unknown'
        })
        .select()
        .single();

      console.log('📝 Session insert result:', { data, error });

      if (!error && data) {
        console.log('✅ Session created:', data.id, 'started at:', now);
        setCurrentSessionId(data.id);
        setIsHolding(true);
        
        // Wait for state to update, then send heartbeat
        setTimeout(async () => {
          console.log('📥 Sending immediate heartbeat for session:', data.id);
          
          const heartbeatTime = new Date().toISOString();
          const { error: heartbeatError } = await supabase
            .from('button_holds')
            .update({ last_heartbeat: heartbeatTime })
            .eq('id', data.id);
            
          if (heartbeatError) {
            console.error('❌ Immediate heartbeat failed:', heartbeatError);
          } else {
            console.log('✅ Immediate heartbeat sent successfully');
          }
        }, 100);
        
        // Start heartbeat every 3 seconds with direct session ID
        heartbeatInterval.current = setInterval(async () => {
          console.log('🫀 Heartbeat executing for session:', data.id);
          try {
            const heartbeatTime = new Date().toISOString();
            console.log('📥 Updating heartbeat in database for:', data.id);
            
            const { error } = await supabase
              .from('button_holds')
              .update({ last_heartbeat: heartbeatTime })
              .eq('id', data.id);
              
            if (error) {
              console.error('❌ Heartbeat failed:', error);
            } else {
              console.log('✅ Heartbeat updated successfully at', heartbeatTime);
            }
          } catch (error) {
            console.error('💥 Heartbeat exception:', error);
          }
        }, 3000);
        
        // Immediate refresh of sessions
        await fetchActiveSessions();
      } else {
        console.error('❌ Error creating session:', error);
      }
    } catch (error) {
      console.error('Error starting session:', error);
    }
  }, [user, country, isHolding, sendHeartbeat, fetchActiveSessions]);

  // End current session - mark as inactive (NOT delete) for statistics
  // Also record country button event with 3-min cooldown for country rankings
  const endSession = useCallback(async () => {
    if (!currentSessionId) {
      console.log('🛑 End session called but no current session');
      return;
    }

    try {
      console.log('🛑 Ending session:', currentSessionId, 'Caller:', new Error().stack?.split('\n')[2]);
      
      // Stop heartbeat immediately
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }

      const now = new Date().toISOString();
      
      // Mark session as inactive (NOT delete) - preserves data for statistics
      const { error } = await supabase
        .from('button_holds')
        .update({
          is_active: false,
          ended_at: now
        })
        .eq('id', currentSessionId);

      if (error) {
        console.error('❌ Error ending session:', error);
      } else {
        console.log('✅ Session ended successfully:', currentSessionId);
      }

      // Record country button event with 3-min cooldown (for country rankings)
      // Pass session_id so backend can validate 3s threshold
      if (user) {
        try {
          const { data: countryResult, error: countryError } = await supabase
            .rpc('record_country_button_event', { 
              user_uuid: user.id, 
              session_uuid: currentSessionId 
            });
          
          if (countryError) {
            console.error('❌ Error recording country event:', countryError);
          } else if (countryResult && countryResult.length > 0) {
            const result = countryResult[0] as { recorded: boolean; cooldown_remaining_seconds: number; reason?: string };
            if (result.recorded) {
              console.log('🌍 Country event recorded for ranking');
            } else {
              console.log('🕐 Country event not recorded:', result.reason || 'unknown', 
                result.cooldown_remaining_seconds > 0 ? `(cooldown: ${result.cooldown_remaining_seconds}s)` : '');
            }
          }
        } catch (countryErr) {
          console.error('Country event error:', countryErr);
        }
      }

      setCurrentSessionId(null);
      setIsHolding(false);
      
      // Immediate refresh of sessions
      await fetchActiveSessions();
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }, [currentSessionId, user, fetchActiveSessions]);

  // Initialize and setup
  useEffect(() => {
    if (!user) {
      setActiveSessions([]);
      setCurrentSessionId(null);
      setIsHolding(false);
      return;
    }

    console.log('🔧 Initializing session manager for user:', user.id);

    // Force cleanup of old sessions on app start
    cleanupInactiveSessions();

    // Initial fetch
    fetchActiveSessions();

    // Setup cleanup interval (every 5 seconds with 10-second timeout)
    cleanupInterval.current = setInterval(cleanupInactiveSessions, 5000);

    // Setup real-time subscription
    const channel = supabase
      .channel('session-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'button_holds'
      }, (payload: any) => {
        console.log('🔄 Real-time change detected:', payload.eventType, payload.new?.id);
        // Don't refresh if it's our own session being updated
        if (payload.eventType === 'UPDATE' && payload.new?.id === currentSessionId) {
          console.log('🔄 Skipping refresh - our own session update');
          return;
        }
        console.log('🔄 Refreshing sessions due to external change');
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