/** Mirrors contrast-pairs.d.mts: the .mjs pipeline modules are plain JavaScript, and a
 *  hand-written declaration is what lets `src/**` import one under tsconfig.app's settings. */
export const SOURCE_TERMS: string[]
export const REPLICA_TERMS: string[]
export const TRADEMARK_TERMS: string[]
export const BANNED_TERMS: string[]
export const ALLOWED_IDIOMS: string[]
export const SCANNED_ROOTS: string[]
export const SCANNED_EXTENSIONS: RegExp

export type Violation = { file: string; line: number; column: number; term: string; excerpt: string }

export function findViolations(text: string, file?: string): Violation[]
export function formatViolation(violation: Violation): string
