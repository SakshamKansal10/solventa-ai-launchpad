import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";

import { getCurrentUser } from "@/lib/actions/auth";
import {
  clearConsultationDraft,
  getConsultationDraft,
  saveConsultationDraft,
} from "@/lib/actions/consultation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { legacyToV2 } from "./migrate";
import {
  applyAnswer,
  resolveScreens,
  screenIndexForKey,
  SUBMIT_KEY,
  type AnswerKey,
  type ConsultationAnswers,
  type ScreenDef,
  type ScreenKey,
} from "./model";

export const CONSULTATION_STORAGE_KEY = "solventia-consultation-v2";
/** The pre-rebuild key. An in-flight v1 draft is carried forward once. */
export const LEGACY_STORAGE_KEY = "solventia-onboarding-v1";

export type SaveState = "idle" | "saving" | "saved" | "local" | "failed";

interface StoredDraft {
  answers: ConsultationAnswers;
  screenKey: string | null;
  savedAt: number;
}

function readLocalDraft(): StoredDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSULTATION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredDraft;
      if (parsed && typeof parsed === "object" && parsed.answers) return parsed;
    }
    const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as { answers?: Record<string, unknown> };
      if (legacy.answers && Object.keys(legacy.answers).length > 0) {
        return {
          answers: legacyToV2(legacy.answers as never),
          screenKey: null,
          savedAt: 0,
        };
      }
    }
  } catch {
    // Corrupt or blocked storage — start fresh.
  }
  return null;
}

function writeLocalDraft(draft: StoredDraft): boolean {
  try {
    window.localStorage.setItem(CONSULTATION_STORAGE_KEY, JSON.stringify(draft));
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function clearLocalDraft() {
  try {
    window.localStorage.removeItem(CONSULTATION_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

interface ConsultationContextValue {
  answers: ConsultationAnswers;
  setAnswer: <K extends AnswerKey>(key: K, value: ConsultationAnswers[K]) => void;
  screens: ScreenDef[];
  /** Index into `screens`; equals `screens.length` on the submit step. */
  index: number;
  current: ScreenDef | null;
  isSubmitStep: boolean;
  /** 1–7. */
  stage: number;
  canContinue: boolean;
  goNext: () => void;
  goBack: () => void;
  restart: () => void;
  /** False until the saved draft (local + server) has been resolved. */
  ready: boolean;
  resumed: boolean;
  dismissResumed: () => void;
  saveState: SaveState;
  /** Flush pending autosave now (used before navigating away / submitting). */
  flush: () => Promise<void>;
  restricted: boolean;
}

const ConsultationContext = createContext<ConsultationContextValue | null>(null);

interface ProviderProps {
  children: ReactNode;
  /** Settings edit sheets and Edit Founder Profile pre-fill from a prior consultation. */
  initialAnswers?: ConsultationAnswers;
  /** Limit the flow to these screens (single-field edit sheets). */
  restrictTo?: ScreenKey[];
  /** Whether to autosave. Edit sheets manage their own persistence. */
  persist?: boolean;
  onFinishRestricted?: (answers: ConsultationAnswers) => void;
}

export function ConsultationProvider({
  children,
  initialAnswers,
  restrictTo,
  persist = true,
  onFinishRestricted,
}: ProviderProps) {
  const { locale } = useLocale();
  const [answers, setAnswers] = useState<ConsultationAnswers>(initialAnswers ?? { v: 2 });
  const [screenKey, setScreenKey] = useState<string | null>(null);
  const [ready, setReady] = useState<boolean>(!persist || Boolean(initialAnswers));
  const [resumed, setResumed] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const dirtyRef = useRef(false);
  const serverTimer = useRef<number | null>(null);
  const localTimer = useRef<number | null>(null);
  const latestRef = useRef({ answers, screenKey });
  latestRef.current = { answers, screenKey };

  const currentUser = useQuery({
    queryKey: ["current-user"],
    queryFn: () => getCurrentUser(),
    staleTime: 5 * 60_000,
    enabled: persist,
  });
  const signedIn = Boolean(currentUser.data);

  const allScreens = useMemo(() => resolveScreens(answers), [answers]);
  const screens = useMemo(
    () => (restrictTo ? allScreens.filter((s) => restrictTo.includes(s.key)) : allScreens),
    [allScreens, restrictTo],
  );

  // ---- restore draft ----
  // The local draft is read synchronously on mount, so the founder never waits
  // on a network call to see their question. A signed-in founder's server draft
  // (newer than the local one, e.g. from another device) is reconciled in the
  // background — and only applied if they haven't already started answering here.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || !persist || initialAnswers) return;
    restoredRef.current = true;
    const local = readLocalDraft();
    if (local && Object.keys(local.answers).length > 0) {
      setAnswers({ ...local.answers, v: 2 as const });
      setScreenKey(local.screenKey);
      setResumed(Boolean(local.screenKey) && local.screenKey !== "basics");
    }
    setReady(true);
  }, [persist, initialAnswers]);

  const serverCheckedRef = useRef(false);
  useEffect(() => {
    if (!persist || initialAnswers || !ready || !signedIn || serverCheckedRef.current) return;
    serverCheckedRef.current = true;
    let cancelled = false;
    getConsultationDraft()
      .then((server) => {
        if (cancelled || !server || dirtyRef.current) return;
        const serverAnswers = (server.answers ?? {}) as Record<string, unknown>;
        if (Object.keys(serverAnswers).length === 0) return;
        const local = readLocalDraft();
        if (Date.parse(server.updatedAt) < (local?.savedAt ?? 0)) return;
        setAnswers({ ...serverAnswers, v: 2 as const } as ConsultationAnswers);
        setScreenKey(server.screenKey);
        setResumed(Boolean(server.screenKey) && server.screenKey !== "basics");
      })
      .catch((err) => console.error("[consultation] draft fetch failed:", err));
    return () => {
      cancelled = true;
    };
  }, [persist, initialAnswers, ready, signedIn]);

  const index = useMemo(() => {
    if (screenKey === SUBMIT_KEY && !restrictTo) return screens.length;
    return Math.min(screenIndexForKey(screens, screenKey), Math.max(0, screens.length - 1));
  }, [screens, screenKey, restrictTo]);
  const isSubmitStep = !restrictTo && screenKey === SUBMIT_KEY;
  const current = isSubmitStep ? null : (screens[index] ?? null);
  const stage = current?.stage ?? (isSubmitStep ? 7 : 1);

  const setAnswer = useCallback<ConsultationContextValue["setAnswer"]>((key, value) => {
    dirtyRef.current = true;
    setAnswers((prev) => applyAnswer(prev, key, value));
  }, []);

  const canContinue = isSubmitStep ? true : Boolean(current?.isComplete(answers));

  const goNext = useCallback(() => {
    dirtyRef.current = true;
    if (isSubmitStep) return;
    if (restrictTo) {
      if (index >= screens.length - 1) {
        onFinishRestricted?.(latestRef.current.answers);
      } else {
        setScreenKey(screens[index + 1].key);
      }
      return;
    }
    if (index >= screens.length - 1) setScreenKey(SUBMIT_KEY);
    else setScreenKey(screens[index + 1].key);
  }, [index, isSubmitStep, onFinishRestricted, restrictTo, screens]);

  const goBack = useCallback(() => {
    dirtyRef.current = true;
    if (isSubmitStep) {
      setScreenKey(screens[screens.length - 1]?.key ?? null);
      return;
    }
    if (index > 0) setScreenKey(screens[index - 1].key);
  }, [index, isSubmitStep, screens]);

  const restart = useCallback(() => {
    clearLocalDraft();
    setAnswers({ v: 2 });
    setScreenKey(null);
    setResumed(false);
    setSaveState("idle");
    if (signedIn) void clearConsultationDraft().catch(() => undefined);
  }, [signedIn]);

  // ---- autosave: local immediately (debounced), server debounced longer ----
  const flush = useCallback(async () => {
    if (!persist || !dirtyRef.current) return;
    if (localTimer.current) window.clearTimeout(localTimer.current);
    if (serverTimer.current) window.clearTimeout(serverTimer.current);
    const { answers: a, screenKey: k } = latestRef.current;
    const localOk = writeLocalDraft({ answers: a, screenKey: k, savedAt: Date.now() });
    if (!signedIn) {
      setSaveState(localOk ? "local" : "failed");
      return;
    }
    try {
      const res = await saveConsultationDraft({
        data: {
          answers: a as Record<string, unknown>,
          screenKey: k,
          stage: current?.stage ?? null,
          locale,
        },
      });
      setSaveState(res.saved ? "saved" : localOk ? "local" : "failed");
    } catch {
      setSaveState(localOk ? "local" : "failed");
    }
  }, [current?.stage, locale, persist, signedIn]);

  useEffect(() => {
    if (!persist || !ready || !dirtyRef.current) return;
    setSaveState("saving");
    if (localTimer.current) window.clearTimeout(localTimer.current);
    localTimer.current = window.setTimeout(() => {
      writeLocalDraft({ answers, screenKey, savedAt: Date.now() });
    }, 250);
    if (signedIn) {
      if (serverTimer.current) window.clearTimeout(serverTimer.current);
      serverTimer.current = window.setTimeout(() => void flush(), 900);
    } else {
      setSaveState("local");
    }
    return () => {
      if (localTimer.current) window.clearTimeout(localTimer.current);
      if (serverTimer.current) window.clearTimeout(serverTimer.current);
    };
  }, [answers, screenKey, persist, ready, signedIn, flush]);

  // Never lose the last answers if the tab closes mid-debounce.
  useEffect(() => {
    if (!persist) return;
    const onHide = () => {
      if (!dirtyRef.current) return;
      const { answers: a, screenKey: k } = latestRef.current;
      writeLocalDraft({ answers: a, screenKey: k, savedAt: Date.now() });
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [persist]);

  const value = useMemo<ConsultationContextValue>(
    () => ({
      answers,
      setAnswer,
      screens,
      index,
      current,
      isSubmitStep,
      stage,
      canContinue,
      goNext,
      goBack,
      restart,
      ready,
      resumed,
      dismissResumed: () => setResumed(false),
      saveState,
      flush,
      restricted: Boolean(restrictTo),
    }),
    [
      answers,
      setAnswer,
      screens,
      index,
      current,
      isSubmitStep,
      stage,
      canContinue,
      goNext,
      goBack,
      restart,
      ready,
      resumed,
      saveState,
      flush,
      restrictTo,
    ],
  );

  return <ConsultationContext.Provider value={value}>{children}</ConsultationContext.Provider>;
}

export function useConsultation(): ConsultationContextValue {
  const ctx = useContext(ConsultationContext);
  if (!ctx) throw new Error("useConsultation must be used within ConsultationProvider");
  return ctx;
}
