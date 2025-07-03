import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OptionsManagerProps {
  options: string[];
  onAddOption: () => void;
  onRemoveOption: (index: number) => void;
  onUpdateOption: (index: number, value: string) => void;
}

const OptionsManager = ({ 
  options, 
  onAddOption, 
  onRemoveOption, 
  onUpdateOption 
}: OptionsManagerProps) => {
  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/30">
      <div className="flex items-center justify-between mb-4">
        <label className="block text-orange-200 font-medium">
          Answer Options (2-5 options)
        </label>
        <Button
          type="button"
          onClick={onAddOption}
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
                onChange={(e) => onUpdateOption(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                className="w-full bg-black/20 border border-orange-500/20 rounded-lg px-4 py-3 text-orange-200 placeholder:text-orange-300/60 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            {options.length > 2 && (
              <Button
                type="button"
                onClick={() => onRemoveOption(index)}
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
  );
};

export default OptionsManager;