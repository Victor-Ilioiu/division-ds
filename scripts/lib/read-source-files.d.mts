/** Mirrors contrast-pairs.d.mts: the .mjs pipeline modules are plain JavaScript, and a
 *  hand-written declaration is what lets `src/**` import one under tsconfig.app's settings. */
export function sourceFiles(
  roots: string[],
  extensions: RegExp
): { path: string; text: string }[]
