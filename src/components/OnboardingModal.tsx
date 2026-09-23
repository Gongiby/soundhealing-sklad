import { useState } from 'react';
import { ONBOARDING_STEPS, markOnboardingDone } from '../onboarding';
import { X, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';

interface Props {
  onClose: () => void;
  onNavigate?: (tab: string) => void;
}

export function OnboardingModal({ onClose, onNavigate }: Props) {
  const [step, setStep] = useState(0);
  const current = ONBOARDING_STEPS[step];
  const isLast = step === ONBOARDING_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      markOnboardingDone();
      onClose();
    } else {
      setStep(s => s + 1);
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const handleSkip = () => {
    markOnboardingDone();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider">
              Шаг {step + 1} из {ONBOARDING_STEPS.length}
            </p>
            <p className="font-display font-bold text-sm mt-0.5">{current.title}</p>
          </div>
          <button
            onClick={handleSkip}
            className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            title="Пропустить"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-5 pt-4">
          <div className="flex gap-1.5">
            {ONBOARDING_STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`flex-1 h-1.5 rounded-full transition-all ${
                  idx <= step
                    ? 'bg-amber-500'
                    : 'bg-stone-200 dark:bg-stone-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="text-center text-6xl py-4">
            {current.icon}
          </div>
          <p className="text-sm text-stone-700 dark:text-stone-300 text-center leading-relaxed">
            {current.description}
          </p>

          {current.action && onNavigate && (
            <button
              onClick={() => {
                if (current.id === 'password') onNavigate('settings');
                if (current.id === 'telegram') onNavigate('settings');
                if (current.id === 'cloud') onNavigate('settings');
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl text-sm font-semibold transition"
            >
              ⚙️ {current.action}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={step === 0}
            className="flex items-center gap-1 px-3 py-2 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 text-sm font-semibold transition disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
            Назад
          </button>
          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold transition"
          >
            {isLast ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Готово!
              </>
            ) : (
              <>
                Далее
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
