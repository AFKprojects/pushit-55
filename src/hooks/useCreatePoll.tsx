import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { validatePollQuestion, validatePollOptions, handleSecureError, RateLimiter, sanitizeInput } from '@/utils/security';

// Rate limiter: max 5 polls per hour
const pollRateLimiter = new RateLimiter(5, 60 * 60 * 1000);

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
    // Sanitize input when updating options
    const sanitized = sanitizeInput(value);
    const newOptions = [...options];
    newOptions[index] = sanitized;
    setOptions(newOptions);
  };

  const setQuestionSecure = (value: string) => {
    // Sanitize input when updating question
    const sanitized = sanitizeInput(value);
    setQuestion(sanitized);
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

    // Client-side rate limiting
    if (!pollRateLimiter.canPerform(user.id)) {
      toast({
        title: "Rate limit exceeded",
        description: "You can only create 5 polls per hour. Please wait before creating another poll.",
        variant: "destructive",
      });
      return;
    }

    // Validate inputs
    const questionValidation = validatePollQuestion(question);
    if (!questionValidation.isValid) {
      toast({
        title: "Invalid question",
        description: questionValidation.error,
        variant: "destructive",
      });
      return;
    }

    const validOptions = options.filter(o => o.trim());
    const optionsValidation = validatePollOptions(validOptions);
    if (!optionsValidation.isValid) {
      toast({
        title: "Invalid options",
        description: optionsValidation.error,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Server-side validation through database function
      const { error: validationError } = await supabase
        .rpc('validate_poll_input', {
          question_text: question.trim(),
          option_texts: validOptions
        });

      if (validationError) throw validationError;
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
      const safeErrorMessage = handleSecureError(error, 'createPoll');
      toast({
        title: "Error",
        description: safeErrorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = question.trim() && question.length <= 200 && options.filter(o => o.trim()).length >= 2;

  return {
    question,
    setQuestion: setQuestionSecure,
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