
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const Create = () => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      // Get user profile for username
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      // Create poll
      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .insert({
          question: question.trim(),
          created_by: user.id,
          creator_username: profile?.username || 'User'
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
      setQuestion('');
      setOptions(['', '']);
      
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

  // Listen for navigation event
  useState(() => {
    const handleNavigate = () => {
      // This will be handled by the parent component
    };
    
    window.addEventListener('navigate-to-polls', handleNavigate);
    return () => window.removeEventListener('navigate-to-polls', handleNavigate);
  });

  const isValid = question.trim() && question.length <= 200 && options.filter(o => o.trim()).length >= 2;

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-8 border border-orange-500/30 text-center max-w-sm">
          <h3 className="text-xl font-bold text-orange-200 mb-4">Login Required</h3>
          <p className="text-orange-300/70 mb-6">
            You must be logged in to create a poll
          </p>
          <Button 
            onClick={() => navigate('/auth')}
            className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-medium"
          >
            Log In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-6 py-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-yellow-500 bg-clip-text text-transparent mb-2">
            Create Poll
          </h1>
          <p className="text-gray-300">
            Ask the Push It! community what they think
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/30">
            <label className="block text-orange-200 font-medium mb-3">
              Question
              <span className="text-orange-300/60 text-sm ml-2">
                ({question.length}/200 characters)
              </span>
            </label>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={200}
              placeholder="What do you want to ask the world today?"
              className="bg-black/20 border-orange-500/20 text-orange-200 placeholder:text-orange-300/60 resize-none"
              rows={3}
            />
          </div>

          <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/30">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-orange-200 font-medium">
                Answer Options (2-5 options)
              </label>
              <Button
                type="button"
                onClick={addOption}
                disabled={options.length >= 5}
                size="sm"
                className="bg-black/20 hover:bg-black/40 text-orange-200 border-orange-500/20"
                variant="outline"
              >
                <Plus size={16} className="mr-1" />
                Add Option
              </Button>
            </div>

            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="w-full bg-black/20 border border-orange-500/20 rounded-lg px-4 py-3 text-orange-200 placeholder:text-orange-300/60 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                  {options.length > 2 && (
                    <Button
                      type="button"
                      onClick={() => removeOption(index)}
                      size="sm"
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-200 border-red-400/20"
                      variant="outline"
                    >
                      <X size={16} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/30">
            <div className="text-orange-200 font-medium mb-2">Poll Duration</div>
            <div className="text-orange-300/70 text-sm">All polls are visible for 24 hours</div>
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 bg-black/20 hover:bg-black/40 text-orange-200 border-orange-500/20"
              onClick={() => {
                setQuestion('');
                setOptions(['', '']);
              }}
              disabled={isSubmitting}
            >
              Clear
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Poll'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Create;
