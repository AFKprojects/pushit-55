import { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Witaj w Push It!',
    description: 'Globalna aplikacja do trzymania przycisku i głosowania w ankietach. Pokażemy Ci jak z niej korzystać.',
  },
  {
    id: 'button',
    title: 'Główny przycisk',
    description: 'Przytrzymaj ten przycisk przez 3 sekundy, aby zobaczyć ile osób na świecie robi to samo co Ty w tym momencie.',
    target: '[data-onboarding="main-button"]',
    position: 'top',
  },
  {
    id: 'login',
    title: 'Zaloguj się',
    description: 'Zaloguj się, aby w pełni korzystać z aplikacji i widzieć liczniki w czasie rzeczywistym.',
    target: '[data-onboarding="login-button"]',
    position: 'bottom',
  },
  {
    id: 'navigation',
    title: 'Nawigacja',
    description: 'Użyj dolnej nawigacji, aby przechodzić między sekcjami aplikacji.',
    target: '[data-onboarding="navigation"]',
    position: 'top',
  },
  {
    id: 'polls',
    title: 'Głosuj w ankietach',
    description: 'W sekcji "Vote" znajdziesz aktualne ankiety. Możesz głosować i śledzić wyniki na żywo.',
    action: 'polls',
  },
  {
    id: 'create',
    title: 'Twórz ankiety',
    description: 'W sekcji "Create" możesz tworzyć własne ankiety i dzielić się nimi ze społecznością.',
    action: 'create',
  },
  {
    id: 'stats',
    title: 'Sprawdzaj statystyki',
    description: 'W sekcji "Stats" znajdziesz statystyki użytkowników i najpopularniejsze ankiety.',
    action: 'statistics',
  },
  {
    id: 'myapp',
    title: 'Twój profil',
    description: 'W sekcji "My App" zarządzasz swoim profilem, zapisanymi ankietami i ustawieniami.',
    action: 'myapp',
  },
  {
    id: 'finish',
    title: 'Gotowe!',
    description: 'Teraz możesz w pełni korzystać z Push It!. Zacznij od przytrzymania głównego przycisku lub zagłosuj w ankiecie.',
  },
];

interface OnboardingProps {
  isVisible: boolean;
  onComplete: () => void;
  onTabChange: (tab: string) => void;
  activeTab: string;
}

export const Onboarding = ({ isVisible, onComplete, onTabChange, activeTab }: OnboardingProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const step = onboardingSteps[currentStep];

  useEffect(() => {
    if (!isVisible) return;

    const updateTarget = () => {
      if (step.target) {
        const element = document.querySelector(step.target) as HTMLElement;
        setTargetElement(element);
      } else {
        setTargetElement(null);
      }
    };

    // Small delay to ensure DOM is updated
    const timeout = setTimeout(updateTarget, 100);
    return () => clearTimeout(timeout);
  }, [step.target, isVisible, activeTab]);

  useEffect(() => {
    if (!isVisible) return;

    // Handle automatic tab switching for certain steps
    if (step.action && step.action !== activeTab) {
      onTabChange(step.action);
    }
  }, [currentStep, step.action, onTabChange, activeTab, isVisible]);

  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleAction = () => {
    if (step.id === 'login' && !user) {
      navigate('/auth');
      return;
    }
    nextStep();
  };

  if (!isVisible) return null;

  const getTooltipPosition = () => {
    if (!targetElement) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const rect = targetElement.getBoundingClientRect();
    const tooltipWidth = 320;
    const tooltipHeight = 200;

    let top = '50%';
    let left = '50%';
    let transform = 'translate(-50%, -50%)';

    switch (step.position) {
      case 'top':
        top = `${rect.top - tooltipHeight - 20}px`;
        left = `${rect.left + rect.width / 2}px`;
        transform = 'translateX(-50%)';
        break;
      case 'bottom':
        top = `${rect.bottom + 20}px`;
        left = `${rect.left + rect.width / 2}px`;
        transform = 'translateX(-50%)';
        break;
      case 'left':
        top = `${rect.top + rect.height / 2}px`;
        left = `${rect.left - tooltipWidth - 20}px`;
        transform = 'translateY(-50%)';
        break;
      case 'right':
        top = `${rect.top + rect.height / 2}px`;
        left = `${rect.right + 20}px`;
        transform = 'translateY(-50%)';
        break;
    }

    return { top, left, transform };
  };

  const tooltipStyle = targetElement ? getTooltipPosition() : {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)'
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50">
        {/* Highlight target element */}
        {targetElement && (
          <div
            className="absolute border-2 border-blue-400 rounded-lg shadow-lg"
            style={{
              top: targetElement.offsetTop - 4,
              left: targetElement.offsetLeft - 4,
              width: targetElement.offsetWidth + 8,
              height: targetElement.offsetHeight + 8,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Tooltip */}
        <div
          className="absolute bg-gray-900 border border-blue-500/30 rounded-xl p-6 max-w-sm shadow-xl"
          style={tooltipStyle}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <Zap className="text-blue-400" size={20} />
              <span className="text-sm text-blue-300 font-medium">
                {currentStep + 1} / {onboardingSteps.length}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-gray-400 hover:text-white -mr-2 -mt-2"
            >
              <X size={16} />
            </Button>
          </div>

          <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
          <p className="text-gray-300 mb-6 leading-relaxed">{step.description}</p>

          <div className="flex justify-between items-center">
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="text-gray-400 hover:text-white disabled:opacity-50"
            >
              <ArrowLeft size={16} className="mr-1" />
              Wstecz
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSkip}
                className="text-gray-400 hover:text-white border-gray-600"
              >
                Pomiń
              </Button>
              <Button
                onClick={handleAction}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
              >
                {step.id === 'login' && !user ? 'Zaloguj się' : 
                 currentStep === onboardingSteps.length - 1 ? 'Zakończ' : 'Dalej'}
                {currentStep < onboardingSteps.length - 1 && step.id !== 'login' && (
                  <ArrowRight size={16} className="ml-1" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Onboarding;