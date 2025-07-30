import { Textarea } from '@/components/ui/textarea';
import { validatePollQuestion, sanitizeInput } from '@/utils/security';
import { useState, useEffect } from 'react';

interface QuestionInputProps {
  question: string;
  onChange: (value: string) => void;
}

const QuestionInput = ({ question, onChange }: QuestionInputProps) => {
  const [validationError, setValidationError] = useState<string>('');
  
  useEffect(() => {
    if (question) {
      const validation = validatePollQuestion(question);
      setValidationError(validation.error || '');
    } else {
      setValidationError('');
    }
  }, [question]);

  const handleChange = (value: string) => {
    // Sanitize input in real-time
    const sanitized = sanitizeInput(value);
    onChange(sanitized);
  };

  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/30">
      <label className="block text-orange-200 font-medium mb-3">
        Question
        <span className="text-orange-300/60 text-sm ml-2">
          ({question.length}/200 characters)
        </span>
      </label>
      <Textarea
        value={question}
        onChange={(e) => handleChange(e.target.value)}
        maxLength={200}
        placeholder="What do you want to ask the world today?"
        className={`bg-black/20 border-orange-500/20 text-orange-200 placeholder:text-orange-300/60 resize-none ${
          validationError ? 'border-red-500/50' : ''
        }`}
        rows={3}
      />
      {validationError && (
        <p className="text-red-400 text-sm mt-2">{validationError}</p>
      )}
    </div>
  );
};

export default QuestionInput;