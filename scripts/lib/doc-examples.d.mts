export function extractExamples(
  text: string,
  fileName?: string
): { caption: string; source: string; insertAt: number }[]
export function injectExampleSources(text: string, fileName?: string): string
