import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export const useCreatePoll = () => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [showCreatorName, setShowCreatorName] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const addOption = () => {
    if (options.length < 5) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const clearForm = () => {
    setQuestion('');
    setOptions(['', '']);
    setShowCreatorName(true);
    setHasAttemptedSubmit(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a poll",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    const validOptions = options.filter(o => o.trim());
    if (validOptions.length < 2) {
      toast({
        title: "Error",
        description: "You must provide at least 2 answer options",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Set expiry to 24 hours from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Create poll
      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .insert({
          question: question.trim(),
          created_by: user.id,
          creator_username: showCreatorName ? (user.email?.split('@')[0] || 'Anonymous') : 'Anonymous',
          status: 'active',
          expires_at: expiresAt.toISOString(),
          total_votes: 0,
          push_count: 0
        })
        .select()
        .single();

      if (pollError) throw pollError;

      // Create poll options
      const optionsData = validOptions.map(option => ({
        poll_id: poll.id,
        option_text: option.trim()
      }));

      const { error: optionsError } = await supabase
        .from('poll_options')
        .insert(optionsData);

      if (optionsError) throw optionsError;

      toast({
        title: "Success!",
        description: "Poll created successfully",
      });

      // Reset form
      clearForm();
      
      // Navigate to polls tab to see the created poll
      window.dispatchEvent(new CustomEvent('navigate-to-polls'));
      
    } catch (error: any) {
      console.error('Error creating poll:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create poll",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = question.trim() && question.length <= 200 && options.filter(o => o.trim()).length >= 2;

  return {
    question,
    setQuestion,
    options,
    addOption,
    removeOption,
    updateOption,
    showCreatorName,
    setShowCreatorName,
    isSubmitting,
    isValid,
    hasAttemptedSubmit,
    clearForm,
    handleSubmit,
    user
  };
};