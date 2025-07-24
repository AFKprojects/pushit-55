
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useGeolocation } from './useGeolocation';

export const useButtonHolds = () => {
  const [activeHolders, setActiveHolders] = useState(0);
  const [currentHoldId, setCurrentHoldId] = useState<string | null>(null);
  const { user } = useAuth();
  const { country } = useGeolocation();

  // Comprehensive cleanup strategy
  const cleanupInactiveSessions = async () => {
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
    
    console.log('Starting comprehensive cleanup...');
    
    // Step 1: Force cleanup ALL sessions older than 1 minute (zombie protection)
    const { data: forceDeleted, error: forceError } = await supabase
      .from('button_holds')
      .delete()
      .lt('started_at', oneMinuteAgo)
      .select();

    if (forceError) {
      console.error('Force cleanup error:', forceError);
    } else {
      console.log('Force deleted zombie sessions:', forceDeleted?.length || 0);
    }

    // Step 2: Regular cleanup - sessions older than 10 seconds
    const { data: regularDeleted, error: regularError } = await supabase
      .from('button_holds')
      .delete()
      .lt('started_at', tenSecondsAgo)
      .select();

    if (regularError) {
      console.error('Regular cleanup error:', regularError);
    } else {
      console.log('Regular cleanup deleted:', regularDeleted?.length || 0);
    }

    // Step 3: Get fresh count
    const { data: currentHolds, error: countError } = await supabase
      .from('button_holds')
      .select('*');
    
    if (!countError && currentHolds) {
      console.log('Active sessions after cleanup:', currentHolds.length);
      setActiveHolders(currentHolds.length);
    }
  };

  useEffect(() => {
    if (!user) {
      setActiveHolders(0);
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
    };
  }, [user]);

  const startHold = async () => {
    if (!user) return;

    try {
      console.log('Starting hold for user:', user.id);
      
      // NUCLEAR CLEANUP - delete ALL sessions first (including zombies from other users)
      console.log('NUCLEAR CLEANUP - deleting ALL sessions...');
      const { data: allDeleted, error: nuclearError } = await supabase
        .from('button_holds')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete everything
        .select();

      if (nuclearError) {
        console.error('Nuclear cleanup error:', nuclearError);
      } else {
        console.log('NUCLEAR: Deleted ALL sessions:', allDeleted?.length || 0);
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
        // No heartbeat - let cleanup handle inactive sessions by time
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
