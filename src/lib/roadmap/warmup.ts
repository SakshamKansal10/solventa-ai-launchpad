/**
 * The names a founder writes down while their roadmap is built (go-live step 3). Kept in this
 * browser only, then offered in Week 1's first list mission and cleared once added.
 */
const KEY = "sol-warmup-names";

export function readWarmupNames(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    return Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string" && !!x.trim())
      : [];
  } catch {
    return [];
  }
}

export function saveWarmupNames(names: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(names.map((n) => n.trim()).filter(Boolean)));
  } catch {
    /* private mode: the founder types them into the mission instead */
  }
}

export function clearWarmupNames() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
