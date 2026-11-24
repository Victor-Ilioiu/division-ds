/** Mirrors contrast-pairs.d.mts: the .mjs pipeline modules are plain JavaScript, and a
 *  hand-written declaration is what lets `src/**` import one under tsconfig.app's settings. Only
 *  what a test in `src/` imports is declared here. */
export const TYPE_ROLES: readonly {
  name: string
  font: string
  size: string
  weight: number
  lineHeight: number
  letterSpacing?: string
  fontFeature?: string
  use: string
  evidence: { file: string; classes: string }
}[]
