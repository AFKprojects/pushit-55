import { Textarea } from '@/components/ui/textarea';

interface QuestionInputProps {
  question: string;
  onChange: (value: string) => void;
}

const QuestionInput = ({ question, onChange }: QuestionInputProps) => {
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
        onChange={(e) => onChange(e.target.value)}
        maxLength={200}
        placeholder="What do you want to ask the world today?"
        className="bg-black/20 border-orange-500/20 text-orange-200 placeholder:text-orange-300/60 resize-none"
        rows={3}
      />
    </div>
  );
};

export default QuestionInput;