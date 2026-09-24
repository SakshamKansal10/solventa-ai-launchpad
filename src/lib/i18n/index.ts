import common from "./messages/common";
import home from "./messages/home";
import consult from "./messages/consult";
import skills from "./messages/skills";
import auth from "./messages/auth";
import shell from "./messages/shell";
import dash from "./messages/dash";
import proof from "./messages/proof";
import roadmap from "./messages/roadmap";
import settings from "./messages/settings";
import { type Locale } from "./locale";

/** Every domain module exports `{ en, hi }` with `hi` typed as
 * `Record<keyof en, string>` — completeness is enforced by the compiler.
 * Add a module here and its keys become valid `MessageKey`s everywhere. */
const modules = [
  common,
  home,
  consult,
  skills,
  auth,
  shell,
  dash,
  proof,
  roadmap,
  settings,
] as const;

type Module = (typeof modules)[number];
type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

export type MessageKey = keyof UnionToIntersection<Module["en"]>;

function merge(locale: Locale): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of modules) Object.assign(out, m[locale]);
  return out;
}

export const MESSAGES: Record<Locale, Record<string, string>> = {
  en: merge("en"),
  hi: merge("hi"),
};

export type MessageParams = Record<string, string | number>;

function interpolate(template: string, params?: MessageParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

/** Pure lookup used by the provider AND by server-side code. Never returns
 * an empty string or the bare key for a Hindi miss: it falls back to the
 * canonical English string, then (last resort, dev-visible) to the key. */
export function translate(locale: Locale, key: string, params?: MessageParams): string {
  const raw = MESSAGES[locale][key] ?? MESSAGES.en[key] ?? key;
  return interpolate(raw, params);
}

/** Selects `${key}.one` / `${key}.other` — Hindi and English share the
 * same two-form rule (1 → one, everything else → other). */
export function translatePlural(
  locale: Locale,
  key: string,
  count: number,
  params?: MessageParams,
): string {
  const form = count === 1 ? "one" : "other";
  return translate(locale, `${key}.${form}`, { n: count, ...params });
}

export type { Locale } from "./locale";
