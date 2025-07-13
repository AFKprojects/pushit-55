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

  const deleteAllPolls = async () => {
    setIsManaging(true);
    
    try {
      // Delete all user votes
      await supabase.from('user_votes').delete().neq('id', '0');
      
      // Delete all saved polls
      await supabase.from('saved_polls').delete().neq('id', '0');
      
      // Delete all hidden polls
      await supabase.from('hidden_polls').delete().neq('id', '0');
      
      // Delete all poll options
      await supabase.from('poll_options').delete().neq('id', '0');
      
      // Delete all polls
      await supabase.from('polls').delete().neq('id', '0');

      toast({
        title: "Success",
        description: "All polls deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting all polls:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete polls",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsManaging(false);
    }
  };

  return {
    managePollsCleanup,
    deleteAllPolls,
    isManaging
  };
};