
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
      // Cleanup holds older than 10 seconds (for faster zombie session cleanup)
      const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
      console.log('Initial cleanup - removing holds older than:', tenSecondsAgo);
      
      const { data: deletedRecords, error: deleteError } = await supabase
        .from('button_holds')
        .delete()
        .lt('started_at', tenSecondsAgo)
        .select();

      if (deleteError) {
        console.error('Cleanup delete error:', deleteError);
      } else {
        console.log('Initial cleanup deleted records:', deletedRecords?.length || 0);
      }

      // Get current active holds count
      const { data, error } = await supabase
        .from('button_holds')
        .select('*');
      
      if (!error && data) {
        console.log('All active holds after cleanup:', data);
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

    // Set up periodic cleanup every 3 seconds for faster zombie session cleanup
    const cleanupInterval = setInterval(async () => {
      const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
      console.log('Periodic cleanup - removing holds older than:', tenSecondsAgo);
      
      const { data: deletedRecords, error: deleteError } = await supabase
        .from('button_holds')
        .delete()
        .lt('started_at', tenSecondsAgo)
        .select();

      if (deleteError) {
        console.error('Periodic cleanup delete error:', deleteError);
      } else if (deletedRecords && deletedRecords.length > 0) {
        console.log('Periodic cleanup deleted records:', deletedRecords.length, deletedRecords);
      }
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(cleanupInterval);
    };
  }, [user]);

  const startHold = async () => {
    if (!user) return;

    try {
      console.log('Starting hold for user:', user.id);
      
      // First, check what exists in the database
      const { data: existingHolds, error: selectError } = await supabase
        .from('button_holds')
        .select('*');
      
      if (!selectError) {
        console.log('All holds before cleanup:', existingHolds);
      }
      
      // Cleanup any existing holds for this user
      console.log('Cleaning up existing holds for user:', user.id);
      const { data: deletedUserHolds, error: deleteUserError } = await supabase
        .from('button_holds')
        .delete()
        .eq('user_id', user.id)
        .select();

      if (deleteUserError) {
        console.error('Error deleting user holds:', deleteUserError);
      } else {
        console.log('Deleted user holds:', deletedUserHolds?.length || 0, deletedUserHolds);
      }

      // Also cleanup old inactive holds
      const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
      console.log('Cleaning up old holds older than:', tenSecondsAgo);
      const { data: deletedOldHolds, error: deleteOldError } = await supabase
        .from('button_holds')
        .delete()
        .lt('started_at', tenSecondsAgo)
        .select();

      if (deleteOldError) {
        console.error('Error deleting old holds:', deleteOldError);
      } else if (deletedOldHolds && deletedOldHolds.length > 0) {
        console.log('Deleted old holds:', deletedOldHolds.length, deletedOldHolds);
      }

      // Now insert the new hold
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
        
        // Check final state
        const { data: finalHolds, error: finalError } = await supabase
          .from('button_holds')
          .select('*');
        
        if (!finalError) {
          console.log('All holds after insert:', finalHolds);
        }
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
