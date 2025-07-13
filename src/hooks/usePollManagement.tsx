import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export const usePollManagement = () => {
  const [isManaging, setIsManaging] = useState(false);
  const { toast } = useToast();

  const managePollsCleanup = async () => {
    setIsManaging(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('manage-polls', {
        method: 'POST'
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message || "Polls managed successfully",
      });

      return data;
    } catch (error: any) {
      console.error('Error managing polls:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to manage polls",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsManaging(false);
    }
  };

  return {
    managePollsCleanup,
    isManaging
  };
};