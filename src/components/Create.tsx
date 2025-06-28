
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const Create = () => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [duration, setDuration] = useState('7');

  const addOption = () => {
    if (options.length < 6) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Handle poll creation
    console.log('Creating poll:', { question, options: options.filter(o => o.trim()), duration });
  };

  const isValid = question.trim() && options.filter(o => o.trim()).length >= 2;

  return (
    <div className="flex-1 px-6 py-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Create New Poll
          </h1>
          <p className="text-gray-600">
            Ask the holding community what they think
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
            <label className="block text-white font-medium mb-3">
              Poll Question
            </label>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to ask the community?"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/60 resize-none"
              rows={3}
            />
          </div>

          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-white font-medium">
                Answer Options
              </label>
              <Button
                type="button"
                onClick={addOption}
                disabled={options.length >= 6}
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
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
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400"
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

          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
            <label className="block text-white font-medium mb-3">
              Poll Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="1" className="bg-gray-800">1 day</option>
              <option value="3" className="bg-gray-800">3 days</option>
              <option value="7" className="bg-gray-800">1 week</option>
              <option value="14" className="bg-gray-800">2 weeks</option>
              <option value="30" className="bg-gray-800">1 month</option>
            </select>
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 bg-white/10 hover:bg-white/20 text-white border-white/20"
              onClick={() => {
                setQuestion('');
                setOptions(['', '']);
                setDuration('7');
              }}
            >
              Clear
            </Button>
            <Button
              type="submit"
              disabled={!isValid}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Poll
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Create;
