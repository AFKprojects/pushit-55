import { supabase } from '@/integrations/supabase/client';

export const addLastHeartbeatColumn = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('add-last-heartbeat-column');
    
    if (error) {
      console.error('Error adding column:', error);
      return { success: false, error };
    }
    
    console.log('Column added successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error calling function:', error);
    return { success: false, error };
  }
};