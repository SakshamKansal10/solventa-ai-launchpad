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
  /** Jumps directly to a step by index — used by Settings' single-field
   * edit sheets (see FounderProfileEditSheet) to land on exactly one
   * question inside a full OnboardingProvider instance, without forcing
   * the founder through every screen before it. Normal onboarding never
   * calls this; it only ever advances via goNext/goBack. */
  goToStep: (index: number) => void;
  skip: () => void;
  restart: () => void;
  progress: number;
  hasSavedProgress: boolean;
  resumeSaved: () => void;
  discardSaved: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({
  children,
  initialAnswers,
}: {
  children: ReactNode;
  /** Pre-fills the flow from a founder's most recent consultation (see
   * Settings → "Edit Founder Profile") instead of starting blank. This is
   * the ONLY difference from a normal fresh consultation — every question
   * screen, and completeConsultation itself, behave exactly as they
   * already do, so editing carries zero new risk to the working
   * submission pipeline. Takes priority over any localStorage draft: an
   * old half-finished draft is almost always staler than the founder's
   * actual last completed consultation. */
  initialAnswers?: OnboardingAnswers;
}) {
  const [answers, setAnswers] = useState<OnboardingAnswers>(initialAnswers ?? {});
  const [stepIndex, setStepIndex] = useState(0);
  const [savedAvailable, setSavedAvailable] = useState(false);

  useEffect(() => {
    // Editing an existing profile already starts with real answers loaded
    // — a leftover "resume saved progress" banner from some earlier,
    // unrelated abandoned draft would be confusing here, not helpful.
    if (Object.keys(answers).length > 0) return;
    const stored = loadStored();
    if (stored && Object.keys(stored.answers).length > 0) {
      setSavedAvailable(true);
    }
    // Deliberately mount-only: this decides whether to show the "resume
    // saved progress" banner once, based on state as of first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setAnswers((prev) => {
      // currentStatus decides which branch (student/employee/entrepreneur)
      // is active, and several downstream questions (and one of the
      // multi-select "goals" variants) only make sense for one branch. A
      // founder can always go Back and change this answer — without this,
      // an answer given under the OLD branch (e.g. a student's "Pocket
      // money" goal, or an employee's yearsExperience) would silently
      // survive into the new branch's profile even though the question
      // that produced it is no longer even shown.
      if (key === "currentStatus" && prev.currentStatus !== value) {
        const {
          industry: _industry,
          industryOther: _industryOther,
          yearsExperience: _yearsExperience,
          annualIncome: _annualIncome,
          willingToLeaveJob: _willingToLeaveJob,
          currentBusinessRevenue: _currentBusinessRevenue,
          currentBusinessCustomers: _currentBusinessCustomers,
          major: _major,
          majorOther: _majorOther,
          institutionName: _institutionName,
          institutionCountry: _institutionCountry,
          institutionManual: _institutionManual,
          goals: _goals,
          ...rest
        } = prev;
        return { ...rest, [key]: value };
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const goNext = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }, [steps.length]);

  const goBack = useCallback(() => {
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  const goToStep = useCallback(
    (index: number) => {
      setStepIndex(Math.max(0, Math.min(index, steps.length - 1)));
    },
    [steps.length],
  );

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

  // Progress counts individual answerable fields, not screens — a
  // question-group step is one screen but several distinct answers, and
  // must weigh the same as several single-question screens would have.
  const answerableIds = steps.flatMap((s) =>
    s.kind === "question" ? [s.id] : s.kind === "question-group" ? s.items.map((i) => i.id) : [],
  );
  const answeredCount = answerableIds.filter((id) => answers[id] !== undefined).length;
  const progress =
    answerableIds.length === 0 ? 0 : Math.round((answeredCount / answerableIds.length) * 100);

  const value: OnboardingContextValue = {
    answers,
    setAnswer,
    steps,
    stepIndex: Math.min(stepIndex, steps.length - 1),
    currentStep,
    goNext,
    goBack,
    goToStep,
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
