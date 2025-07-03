import QuestionInput from './QuestionInput';
import OptionsManager from './OptionsManager';
import PollDurationInfo from './PollDurationInfo';
import FormActions from './FormActions';
import { useCreatePoll } from '@/hooks/useCreatePoll';

const CreatePollForm = () => {
  const {
    question,
    setQuestion,
    options,
    addOption,
    removeOption,
    updateOption,
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