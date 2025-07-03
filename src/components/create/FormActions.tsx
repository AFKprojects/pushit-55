import { Button } from '@/components/ui/button';

interface FormActionsProps {
  isValid: boolean;
  isSubmitting: boolean;
  onClear: () => void;
}

const FormActions = ({ isValid, isSubmitting, onClear }: FormActionsProps) => {
  return (
    <div className="flex gap-4">
      <Button
        type="button"
        variant="outline"
        className="flex-1 bg-black/20 hover:bg-black/40 text-orange-200 border-orange-500/20"
        onClick={onClear}
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
  );
};

export default FormActions;