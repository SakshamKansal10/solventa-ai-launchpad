import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteMissionEntry,
  getMissionWorkspace,
  saveMissionEntry,
  type MissionWorkspaceDTO,
} from "@/lib/actions/missions";
import type { MessageKey } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { EntryValue, MissionEntry } from "@/lib/missions/workspace";
import { useInvalidateFounder } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { ActionButton, Label, MistCard } from "./ui";

/**
 * The mission's own work area (part 4, feature 1) — under the headline on a mission page: a list
 * to build, interviews to log, a short lesson with a check, a summary, or (missions written
 * before workspaces existed) a notes box. Everything saves as the founder types. Renders nothing
 * until migration 0015 is applied (the page then keeps its steps only).
 */

export const missionWorkspaceKey = (taskId: string) => ["mission-workspace", taskId] as const;

export function useMissionWorkspace(taskId: string) {
  return useQuery({
    queryKey: missionWorkspaceKey(taskId),
    queryFn: () => getMissionWorkspace({ data: { taskId } }),
    staleTime: 10_000,
  });
}

function useEntryMutations(taskId: string) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateFounder();
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: missionWorkspaceKey(taskId) });
    void invalidate();
  };
  const save = useMutation({
    mutationFn: (v: {
      id?: string;
      kind: MissionEntry["kind"];
      data: Record<string, EntryValue>;
    }) => saveMissionEntry({ data: { taskId, ...v } }),
    onSuccess: refresh,
    onError: (err) => {
      console.error("[mission] save failed:", err);
      toast.error(t("v2.ws.saveError"));
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteMissionEntry({ data: { id } }),
    onSuccess: refresh,
  });
  return { save, remove };
}

const inputCls =
  "min-h-14 w-full rounded-2xl border border-sol-ink/20 bg-white px-[18px] text-[18px] text-sol-ink placeholder:text-sol-muted focus-visible:border-sol-cobalt focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sol-cobalt";

/** The reason Mark as done is not available yet, in plain words. */
export function useGateReason() {
  const { t } = useLocale();
  return (ws: MissionWorkspaceDTO | undefined) => {
    if (!ws || ws.gate.met || !ws.gate.metric) return null;
    const left = ws.gate.need - ws.gate.have;
    return t(`v2.ws.gate.${ws.gate.metric}` as MessageKey, { n: left, need: ws.gate.need });
  };
}

export function MissionWorkspace({ taskId, locked }: { taskId: string; locked: boolean }) {
  const ws = useMissionWorkspace(taskId);
  if (!ws.data?.available) return null;
  const d = ws.data;
  return (
    <div data-testid="mission-workspace" data-workspace={d.type}>
      {d.type === "list" ? (
        <ListWorkspace taskId={taskId} ws={d} locked={locked} />
      ) : d.type === "interviews" ? (
        <InterviewsWorkspace taskId={taskId} ws={d} locked={locked} />
      ) : d.type === "learn" ? (
        <LearnWorkspace taskId={taskId} ws={d} locked={locked} />
      ) : d.type === "summary" ? (
        <SummaryWorkspace taskId={taskId} ws={d} locked={locked} />
      ) : (
        <NotesWorkspace taskId={taskId} ws={d} locked={locked} />
      )}
    </div>
  );
}

type WsProps = { taskId: string; ws: MissionWorkspaceDTO; locked: boolean };

function ListWorkspace({ taskId, ws, locked }: WsProps) {
  const { t } = useLocale();
  const { save, remove } = useEntryMutations(taskId);
  const rows = ws.entries.filter((e) => e.kind === "list_row");
  const target = ws.spec?.target ?? Math.max(3, rows.length);
  const named = rows.filter((r) => String(r.data.name ?? "").trim()).length;
  const [drafts, setDrafts] = useState(rows.length === 0 ? 3 : 1);
  return (
    <MistCard aria-labelledby="list-title" className="gap-[18px]">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2
          id="list-title"
          className="font-display text-[clamp(26px,2.6vw,36px)] font-medium tracking-[-0.02em] text-sol-ink"
        >
          {t("v2.ws.list.title")}
        </h2>
        <p className="text-[18px] text-sol-secondary" data-testid="list-count">
          <span className="font-semibold text-sol-ink">
            {t("v2.ws.list.count", { x: named, y: target })}
          </span>{" "}
          · {t("v2.ws.autosave")}
        </p>
      </div>
      {rows.map((r, i) => (
        <ListRow
          key={r.id}
          index={i + 1}
          entry={r}
          locked={locked}
          onSave={(data) => save.mutate({ id: r.id, kind: "list_row", data })}
          onRemove={() => remove.mutate(r.id)}
        />
      ))}
      {!locked &&
        Array.from({ length: drafts }, (_, k) => (
          <ListRow
            key={`draft-${rows.length}-${k}`}
            index={rows.length + k + 1}
            locked={false}
            onSave={(data) => {
              if (!String(data.name ?? "").trim()) return;
              save.mutate({ kind: "list_row", data });
              setDrafts((n) => Math.max(1, n - 1));
            }}
          />
        ))}
      {!locked && (
        <button
          type="button"
          onClick={() => setDrafts((n) => n + 1)}
          data-testid="list-add"
          className="inline-flex min-h-14 items-center gap-2.5 self-start rounded-full border border-dashed border-sol-ink/40 px-6 text-[18px] font-medium text-sol-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sol-cobalt"
        >
          <Plus className="size-5" aria-hidden="true" />
          {t("v2.ws.list.add")}
        </button>
      )}
    </MistCard>
  );
}

function ListRow({
  index,
  entry,
  locked,
  onSave,
  onRemove,
}: {
  index: number;
  entry?: MissionEntry;
  locked: boolean;
  onSave: (data: Record<string, EntryValue>) => void;
  onRemove?: () => void;
}) {
  const { t } = useLocale();
  const [v, setV] = useState({
    name: String(entry?.data.name ?? ""),
    phone: String(entry?.data.phone ?? ""),
    where: String(entry?.data.where ?? ""),
  });
  const commit = () => {
    const same =
      entry &&
      v.name === String(entry.data.name ?? "") &&
      v.phone === String(entry.data.phone ?? "") &&
      v.where === String(entry.data.where ?? "");
    if (!same) onSave(v);
  };
  return (
    <div
      className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr))]"
      data-testid="list-row"
    >
      <input
        className={inputCls}
        aria-label={t("v2.ws.list.nameAria", { n: index })}
        placeholder={t("v2.ws.list.name", { n: index })}
        value={v.name}
        disabled={locked}
        onChange={(e) => setV({ ...v, name: e.target.value })}
        onBlur={commit}
      />
      <input
        className={inputCls}
        type="tel"
        aria-label={t("v2.ws.list.phoneAria", { n: index })}
        placeholder={t("v2.ws.list.phone")}
        value={v.phone}
        disabled={locked}
        onChange={(e) => setV({ ...v, phone: e.target.value })}
        onBlur={commit}
      />
      <div className="flex gap-2">
        <input
          className={inputCls}
          aria-label={t("v2.ws.list.whereAria", { n: index })}
          placeholder={t("v2.ws.list.where")}
          value={v.where}
          disabled={locked}
          onChange={(e) => setV({ ...v, where: e.target.value })}
          onBlur={commit}
        />
        {onRemove && !locked && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t("v2.ws.list.remove", { n: index })}
            className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl text-sol-muted hover:text-sol-ink focus-visible:outline-2 focus-visible:outline-sol-cobalt"
          >
            <Trash2 className="size-5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

function InterviewsWorkspace({ taskId, ws, locked }: WsProps) {
  const { t, locale } = useLocale();
  const { save } = useEntryMutations(taskId);
  const logs = ws.entries.filter((e) => e.kind === "interview");
  const target = ws.gate.need || 4;
  const [lang, setLang] = useState<"en" | "hi">(locale === "hi" ? "hi" : "en");
  const message = ws.spec?.firstMessage?.[lang] ?? null;
  const today = new Date().toISOString().slice(0, 10);
  const blank = { person: "", date: today, answer: "", words: "" };
  const [form, setForm] = useState(blank);
  const [saved, setSaved] = useState(false);
  const canSave = form.person.trim() && form.answer && !locked;
  return (
    <div className="flex flex-wrap items-start gap-6">
      <section
        aria-labelledby="say-title"
        className="flex min-w-0 flex-[1_1_520px] flex-col gap-[22px]"
      >
        <h2
          id="say-title"
          className="font-display text-[clamp(26px,2.6vw,36px)] font-medium tracking-[-0.02em] text-sol-ink"
        >
          {t("v2.ws.int.say")}
        </h2>
        {message && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Label as="h3">{t("v2.ws.int.firstMessage")}</Label>
              <div role="group" aria-label={t("v2.ws.int.langAria")} className="flex gap-1">
                {(["en", "hi"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    aria-pressed={lang === l}
                    onClick={() => setLang(l)}
                    className={cn(
                      "min-h-11 rounded-full px-4 text-[16px] font-medium",
                      lang === l ? "bg-sol-ink text-white" : "border border-sol-ink/25",
                    )}
                    lang={l}
                  >
                    {l === "en" ? "English" : "हिन्दी"}
                  </button>
                ))}
              </div>
            </div>
            <p
              className="whitespace-pre-line rounded-[24px] bg-sol-ivory p-5 text-[19px] leading-[1.5] text-sol-ink"
              lang={lang}
              data-testid="first-message"
            >
              {message}
            </p>
            <ActionButton
              tone="secondary"
              size="md"
              arrow={false}
              className="self-start"
              data-testid="copy-message"
              onClick={() => {
                void navigator.clipboard?.writeText(message).then(
                  () => toast.success(t("v2.ws.int.copied")),
                  () => toast.error(t("v2.ws.int.copyError")),
                );
              }}
            >
              <Copy className="size-5" aria-hidden="true" />
              {t("v2.ws.int.copy")}
            </ActionButton>
          </div>
        )}
        {(ws.spec?.questions?.length ?? 0) > 0 && (
          <div className="flex flex-col gap-1.5">
            <Label as="h3" className="pb-2">
              {t("v2.ws.int.ask")}
            </Label>
            <ol className="flex flex-col">
              {ws.spec!.questions!.map((q, i) => (
                <li
                  key={q}
                  className="flex items-baseline gap-4 border-t border-sol-border py-4 text-[20px] leading-[1.35] text-sol-ink last:border-b"
                >
                  <span aria-hidden="true" className="w-6 shrink-0 text-sol-muted">
                    {i + 1}
                  </span>
                  {q}
                </li>
              ))}
            </ol>
          </div>
        )}
        <p className="dash-body flex gap-3 text-sol-ink">
          <span aria-hidden="true" className="dash-warn-text font-semibold">
            !
          </span>
          {ws.spec?.rule ?? t("v2.ws.int.rule")}
        </p>
      </section>

      <MistCard
        as="section"
        aria-labelledby="log-title"
        className="min-w-0 flex-[1_1_420px] gap-5"
        data-testid="interview-log"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2
            id="log-title"
            className="font-display text-[clamp(26px,2.6vw,36px)] font-medium tracking-[-0.02em] text-sol-ink"
          >
            {t("v2.ws.int.log")}
          </h2>
          <p className="text-[18px] text-sol-secondary" data-testid="interview-count">
            {t("v2.ws.int.count", { x: logs.length, y: target })}
          </p>
        </div>
        {!locked && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!canSave) return;
              save.mutate(
                { kind: "interview", data: { ...form } },
                {
                  onSuccess: () => {
                    setForm({ ...blank });
                    setSaved(true);
                  },
                },
              );
            }}
          >
            <label className="flex flex-col gap-2">
              <span className="text-[17px] font-medium text-sol-ink">{t("v2.ws.int.who")}</span>
              <input
                className={inputCls}
                list={`people-${taskId}`}
                value={form.person}
                onChange={(e) => setForm({ ...form, person: e.target.value })}
                data-testid="int-person"
                placeholder={ws.listNames.length ? t("v2.ws.int.whoFromList") : ""}
              />
              <datalist id={`people-${taskId}`}>
                {ws.listNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[17px] font-medium text-sol-ink">{t("v2.ws.int.when")}</span>
              <input
                className={inputCls}
                type="date"
                value={form.date}
                max={today}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </label>
            <fieldset className="flex flex-col gap-2">
              <legend className="pb-2 text-[17px] font-medium text-sol-ink">
                {t("v2.ws.int.answer")}
              </legend>
              <div className="flex flex-wrap gap-2">
                {(["yes", "no", "unsure"] as const).map((a) => (
                  <label
                    key={a}
                    className={cn(
                      "inline-flex min-h-12 cursor-pointer items-center rounded-full border px-5 text-[17px]",
                      form.answer === a
                        ? "border-sol-ink bg-sol-ink text-white"
                        : "border-sol-ink/25 bg-white text-sol-ink",
                    )}
                  >
                    <input
                      type="radio"
                      name={`answer-${taskId}`}
                      value={a}
                      className="sr-only"
                      checked={form.answer === a}
                      onChange={() => setForm({ ...form, answer: a })}
                      data-testid={`int-answer-${a}`}
                    />
                    {t(`v2.ws.int.answer.${a}` as MessageKey)}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="flex flex-col gap-2">
              <span className="text-[17px] font-medium text-sol-ink">{t("v2.ws.int.words")}</span>
              <textarea
                className={cn(inputCls, "min-h-28 py-3")}
                value={form.words}
                onChange={(e) => setForm({ ...form, words: e.target.value })}
                data-testid="int-words"
              />
            </label>
            <ActionButton
              type="submit"
              tone="secondary"
              size="md"
              arrow={false}
              disabled={!canSave}
              loading={save.isPending}
              className="self-start"
              data-testid="int-save"
            >
              {t("v2.ws.int.save")}
            </ActionButton>
            {saved && (
              // The same words for a Yes and a No: logging is what counts, not the answer.
              <p role="status" className="dash-body text-sol-ink" data-testid="int-saved">
                {t("v2.ws.int.saved")}
              </p>
            )}
          </form>
        )}
        {logs.length > 0 && (
          <ul className="flex flex-col" data-testid="interview-entries">
            {logs.map((l) => (
              <li key={l.id} className="border-t border-sol-ink/10 py-3 text-[17px] text-sol-ink">
                <span className="font-medium">{String(l.data.person)}</span>
                <span className="text-sol-secondary">
                  {" "}
                  · {String(l.data.date ?? "")} ·{" "}
                  {t(`v2.ws.int.answer.${String(l.data.answer || "unsure")}` as MessageKey)}
                </span>
                {String(l.data.words ?? "") && (
                  <span className="mt-1 block text-sol-secondary" dir="auto">
                    “{String(l.data.words)}”
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </MistCard>
    </div>
  );
}

function LearnWorkspace({ taskId, ws, locked }: WsProps) {
  const { t } = useLocale();
  const { save } = useEntryMutations(taskId);
  const quiz = ws.spec?.quiz ?? [];
  const last = ws.entries.filter((e) => e.kind === "quiz").at(-1);
  const [answers, setAnswers] = useState<number[]>(
    ((last?.data.answers as number[] | undefined) ?? []).slice(),
  );
  const checked = Boolean(last);
  const correct = quiz.filter(
    (q, i) => (last?.data.answers as number[] | undefined)?.[i] === q.answer,
  ).length;
  return (
    <div className="flex flex-col gap-6">
      {(ws.spec?.lesson?.length ?? 0) > 0 && (
        <MistCard as="section" aria-labelledby="lesson-title">
          <Label as="h2" id="lesson-title">
            {t("v2.ws.learn.lesson")}
          </Label>
          <ol className="flex flex-col gap-3">
            {ws.spec!.lesson!.map((p, i) => (
              <li key={p} className="flex gap-4 text-[20px] leading-[1.4] text-sol-ink">
                <span aria-hidden="true" className="w-6 shrink-0 text-sol-muted">
                  {i + 1}
                </span>
                {p}
              </li>
            ))}
          </ol>
        </MistCard>
      )}
      {quiz.length > 0 && (
        <section aria-labelledby="quiz-title" className="flex flex-col gap-5">
          <Label as="h2" id="quiz-title">
            {t("v2.ws.learn.check")}
          </Label>
          {quiz.map((q, i) => (
            <fieldset key={q.q} className="flex flex-col gap-2.5">
              <legend className="pb-2 text-[20px] font-medium text-sol-ink">{q.q}</legend>
              {q.options.map((o, k) => (
                <label
                  key={o}
                  className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-sol-ink/20 bg-white px-4 text-[18px] text-sol-ink"
                >
                  <input
                    type="radio"
                    name={`q-${taskId}-${i}`}
                    checked={answers[i] === k}
                    disabled={locked}
                    onChange={() => {
                      const next = answers.slice();
                      next[i] = k;
                      setAnswers(next);
                    }}
                    className="size-5 accent-[var(--sol-cobalt)]"
                  />
                  {o}
                </label>
              ))}
            </fieldset>
          ))}
          {!locked && (
            <ActionButton
              tone="secondary"
              size="md"
              arrow={false}
              className="self-start"
              disabled={answers.filter((a) => a !== undefined).length < quiz.length}
              onClick={() => save.mutate({ kind: "quiz", data: { answers } })}
              data-testid="quiz-check"
            >
              {t("v2.ws.learn.checkAnswers")}
            </ActionButton>
          )}
          {checked && (
            <p role="status" className="dash-body text-sol-ink">
              {t("v2.ws.learn.result", { x: correct, y: quiz.length })}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function SummaryWorkspace({ taskId, ws, locked }: WsProps) {
  const { t } = useLocale();
  const { save } = useEntryMutations(taskId);
  const prompts = ws.spec?.prompts?.length ? ws.spec.prompts : [t("v2.ws.notes.prompt")];
  const last = ws.entries.filter((e) => e.kind === "summary").at(-1);
  const [answers, setAnswers] = useState<string[]>(
    prompts.map((_, i) => String((last?.data.answers as string[] | undefined)?.[i] ?? "")),
  );
  return (
    <MistCard as="section" aria-labelledby="summary-title">
      <h2
        id="summary-title"
        className="font-display text-[clamp(26px,2.6vw,36px)] font-medium tracking-[-0.02em] text-sol-ink"
      >
        {t("v2.ws.summary.title")}
      </h2>
      {prompts.map((p, i) => (
        <label key={p} className="flex flex-col gap-2">
          <span className="text-[18px] font-medium text-sol-ink">{p}</span>
          <textarea
            className={cn(inputCls, "min-h-28 py-3")}
            value={answers[i]}
            disabled={locked}
            onChange={(e) => {
              const next = answers.slice();
              next[i] = e.target.value;
              setAnswers(next);
            }}
            onBlur={() => save.mutate({ id: last?.id, kind: "summary", data: { answers } })}
            data-testid={`summary-${i}`}
          />
        </label>
      ))}
      <p className="dash-meta">{t("v2.ws.autosave")}</p>
    </MistCard>
  );
}

/** Missions written before workspaces existed: a notes box and "what did you produce?". */
function NotesWorkspace({ taskId, ws, locked }: WsProps) {
  const { t } = useLocale();
  const { save } = useEntryMutations(taskId);
  const note = ws.entries.filter((e) => e.kind === "note").at(-1);
  const [text, setText] = useState(String(note?.data.text ?? ""));
  useEffect(() => setText(String(note?.data.text ?? "")), [note?.id, note?.data.text]);
  return (
    <MistCard as="section" aria-labelledby="notes-title" data-testid="notes-workspace">
      <label className="flex flex-col gap-2">
        <span
          id="notes-title"
          className="font-display text-[clamp(22px,2.2vw,30px)] font-medium tracking-[-0.015em] text-sol-ink"
        >
          {t("v2.ws.notes.prompt")}
        </span>
        <textarea
          className={cn(inputCls, "min-h-32 py-3")}
          value={text}
          disabled={locked}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            if (text !== String(note?.data.text ?? ""))
              save.mutate({ id: note?.id, kind: "note", data: { text } });
          }}
          data-testid="notes-text"
        />
      </label>
      <p className="dash-meta">{t("v2.ws.autosave")}</p>
    </MistCard>
  );
}
