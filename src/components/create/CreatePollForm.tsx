import QuestionInput from './QuestionInput';
import OptionsManager from './OptionsManager';
import PollDurationInfo from './PollDurationInfo';
import FormActions from './FormActions';
import { useCreatePoll } from '@/hooks/useCreatePoll';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const CreatePollForm = () => {
  const {
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
    clearForm,
    handleSubmit
  } = useCreatePoll();

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
          <QuestionInput 
            question={question}
            onChange={setQuestion}
          />

          <OptionsManager
            options={options}
            onAddOption={addOption}
            onRemoveOption={removeOption}
            onUpdateOption={updateOption}
          />

          <div className="bg-black/20 border border-orange-500/20 rounded-xl p-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-creator"
                checked={showCreatorName}
                onCheckedChange={(checked) => setShowCreatorName(checked === true)}
                className="border-orange-500/50"
              />
              <Label htmlFor="show-creator" className="text-orange-200 text-sm">
                Show my username as poll creator
              </Label>
            </div>
          </div>

          <PollDurationInfo />

          <FormActions
            isValid={isValid}
            isSubmitting={isSubmitting}
            onClear={clearForm}
          />
        </form>
      </div>
    </div>
  );
};

export default CreatePollForm;