export function composite(color: string, backdrop?: string): string
export function contrastRatio(a: string, b: string, backdrop?: string): number
export function checkPairs(
  pairs: { name: string; fg: string; bg: string; backdrop?: string; minRatio: number; maxRatio?: number }[]
): { name: string; ratio: number; minRatio: number; maxRatio?: number; pass: boolean }[]
