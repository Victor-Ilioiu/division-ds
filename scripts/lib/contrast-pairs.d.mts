/** Mirrors contrast.d.mts: the .mjs pipeline modules are plain JavaScript, and a hand-written
 *  declaration is what lets `src/**` import one under tsconfig.app's settings. */
export function pairsForTheme(
  themeFile: string
): { name: string; fg: string; bg: string; backdrop?: string; minRatio: number; maxRatio?: number }[]
