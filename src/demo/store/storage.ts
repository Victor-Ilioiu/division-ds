/** Reads and parses `key` from sessionStorage, falling back when the key is absent, the value
 *  will not parse, storage itself throws (a private window, a blocked or full store), or the
 *  parsed value fails `isValid` (a tampered or stale shape from an earlier version of this
 *  store). The validator is mandatory: a provider that trusts an unchecked shape from storage
 *  is exactly what crashes on a hand-edited or version-skewed value. */
export function readJson<T>(key: string, fallback: T, isValid: (value: unknown) => value is T): T {
  try {
    const raw = sessionStorage.getItem(key)
    if (raw === null) return fallback
    const parsed: unknown = JSON.parse(raw)
    return isValid(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

/** Best-effort only: a provider that cannot write here keeps working in memory for the rest of
 *  the tab's life, it just does not survive a reload. */
export function writeJson<T>(key: string, value: T): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // per-tab convenience only -- losing it is fine
  }
}
