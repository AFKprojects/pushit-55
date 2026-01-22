import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GuestPreviewState {
  canPreview: boolean;
  remaining: number;
  used: number;
  loading: boolean;
  limitReached: boolean;
}

// Generate device ID for guest tracking
const getDeviceId = () => {
  if (typeof window === 'undefined') return 'server';
  
  let deviceId = localStorage.getItem('guestDeviceId');
  if (!deviceId) {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    deviceId = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('guestDeviceId', deviceId);
  }
  return deviceId;
};

export const useGuestPreview = () => {
  const [state, setState] = useState<GuestPreviewState>({
    canPreview: true,
    remaining: 10,
    used: 0,
    loading: false,
    limitReached: false
  });
  
  const deviceId = useRef<string>(getDeviceId());

  // Check if guest can preview (without consuming a preview)
  const checkPreviewStatus = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const { data, error } = await supabase
        .rpc('guest_can_preview', { p_device_id: deviceId.current });
      
      if (error) {
        console.error('Error checking guest preview:', error);
        setState(prev => ({ ...prev, loading: false }));
        return false;
      }
      
      if (data && data.length > 0) {
        const result = data[0];
        setState({
          canPreview: result.can_preview,
          remaining: result.remaining,
          used: result.used,
          loading: false,
          limitReached: !result.can_preview
        });
        return result.can_preview;
      }
      
      setState(prev => ({ ...prev, loading: false }));
      return true; // Default to allowing if no data
    } catch (error) {
      console.error('Error in checkPreviewStatus:', error);
      setState(prev => ({ ...prev, loading: false }));
      return false;
    }
  }, []);

  // Register a preview (consumes one of 10 daily previews)
  const registerPreview = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .rpc('guest_register_preview', { p_device_id: deviceId.current });
      
      if (error) {
        console.error('Error registering guest preview:', error);
        return false;
      }
      
      if (data && data.length > 0) {
        const result = data[0];
        setState({
          canPreview: result.remaining > 0,
          remaining: result.remaining,
          used: result.used,
          loading: false,
          limitReached: result.remaining <= 0
        });
        return result.success;
      }
      
      return false;
    } catch (error) {
      console.error('Error in registerPreview:', error);
      return false;
    }
  }, []);

  return {
    ...state,
    checkPreviewStatus,
    registerPreview,
    deviceId: deviceId.current
  };
};
