import { Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { validatePollOption, sanitizeInput } from '@/utils/security';
import { useState, useEffect } from 'react';

interface OptionsManagerProps {
  options: string[];
  onAddOption: () => void;
  onRemoveOption: (index: number) => void;
  onUpdateOption: (index: number, value: string) => void;
  hasAttemptedSubmit?: boolean;
}

const OptionsManager = ({ 
  options, 
  onAddOption, 
  onRemoveOption, 
  onUpdateOption,
  hasAttemptedSubmit = false
}: OptionsManagerProps) => {
  const [optionErrors, setOptionErrors] = useState<string[]>([]);

  useEffect(() => {
    const errors = options.map(option => {
      if (!option) return '';
      const validation = validatePollOption(option);
      return validation.error || '';
    });
    setOptionErrors(errors);
  }, [options]);

  const handleUpdateOption = (index: number, value: string) => {
    // Sanitize input in real-time
    const sanitized = sanitizeInput(value);
    onUpdateOption(index, sanitized);
  };
  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/30">
      <div className="flex items-center justify-between mb-4">
        <label className="block text-orange-200 font-medium">
          Answer Options (2-5 options)
        </label>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => options.length > 2 && onRemoveOption(options.length - 1)}
            disabled={options.length <= 2}
            size="sm"
            className="bg-red-500/20 hover:bg-red-500/30 text-red-200 border-red-400/20"
            variant="outline"
          >
            <Minus size={16} />
          </Button>
          <Button
            type="button"
            onClick={onAddOption}
            disabled={options.length >= 5}
            size="sm"
            className="bg-green-500/20 hover:bg-green-500/30 text-green-200 border-green-400/20"
            variant="outline"
          >
            <Plus size={16} />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={option}
                onChange={(e) => handleUpdateOption(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                maxLength={100}
                className={`w-full bg-black/20 border rounded-lg px-4 py-3 text-orange-200 placeholder:text-orange-300/60 focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                  (hasAttemptedSubmit && option.trim() === '') || optionErrors[index] ? 'border-red-500/50' : 'border-orange-500/20'
                }`}
              />
              {hasAttemptedSubmit && option.trim() === '' && (
                <p className="text-red-300/80 text-xs mt-1">This option cannot be empty</p>
              )}
              {optionErrors[index] && (
                <p className="text-red-400 text-xs mt-1">{optionErrors[index]}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OptionsManager;