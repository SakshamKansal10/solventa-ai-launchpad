import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { OnboardingAnswers } from "./onboarding-types";
import { resolveSteps, type Step } from "./onboarding-steps";

const STORAGE_KEY = "solventia-onboarding-v1";

interface StoredState {
  answers: OnboardingAnswers;
  stepIndex: number;
}

function loadStored(): StoredState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredState;
  } catch {
    return null;
  }
}

interface OnboardingContextValue {
  answers: OnboardingAnswers;
  setAnswer: <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => void;
  steps: Step[];
  stepIndex: number;
  currentStep: Step;
  goNext: () => void;
  goBack: () => void;
  skip: () => void;
  restart: () => void;
  progress: number;
  hasSavedProgress: boolean;
  resumeSaved: () => void;
  discardSaved: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [savedAvailable, setSavedAvailable] = useState(false);

  useEffect(() => {
    const stored = loadStored();
    if (stored && Object.keys(stored.answers).length > 0) {
      setSavedAvailable(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (Object.keys(answers).length === 0 && stepIndex === 0) return;
    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, stepIndex }));
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [answers, stepIndex]);

  const steps = useMemo(() => resolveSteps(answers), [answers]);
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];

  const setAnswer = useCallback<OnboardingContextValue["setAnswer"]>((key, value) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }, []);

  const goNext = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }, [steps.length]);

  const goBack = useCallback(() => {
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  const skip = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }, [steps.length]);

  const restart = useCallback(() => {
    setAnswers({});
    setStepIndex(0);
    setSavedAvailable(false);
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const resumeSaved = useCallback(() => {
    const stored = loadStored();
    if (stored) {
      setAnswers(stored.answers);
      setStepIndex(stored.stepIndex);
    }
    setSavedAvailable(false);
  }, []);

  const discardSaved = useCallback(() => {
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    setSavedAvailable(false);
  }, []);

  const questionSteps = steps.filter((s) => s.kind === "question");
  const answeredQuestionSteps = questionSteps.filter((s) =>
    s.kind === "question" ? answers[s.id] !== undefined : false,
  );
  const progress =
    questionSteps.length === 0
      ? 0
      : Math.round((answeredQuestionSteps.length / questionSteps.length) * 100);

  const value: OnboardingContextValue = {
    answers,
    setAnswer,
    steps,
    stepIndex: Math.min(stepIndex, steps.length - 1),
    currentStep,
    goNext,
    goBack,
    skip,
    restart,
    progress,
    hasSavedProgress: savedAvailable,
    resumeSaved,
    discardSaved,
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
