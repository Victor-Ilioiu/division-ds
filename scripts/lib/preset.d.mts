/** Mirrors contrast.d.mts: lets `src/**` import the plain-JavaScript preset module. */
export type Preset = { signal: string; neutral: string }
type Result = { name: string; ratio: number; minRatio: number; maxRatio?: number; pass: boolean }
type Theme = { tokens: Record<string, string>; results: Result[] }
export type Adjustment = { token: string; from: string; to: string; fixed: string[] }
export type BuiltTheme = { themes: { dark: Theme; light: Theme }; failures: (Result & { theme: string })[]; adjustments: { dark: Adjustment[]; light: Adjustment[] } }

export const PRESET_VERSION: number
export const DEFAULT_PRESET: Preset
export const NEUTRAL_BOUNDS: { lightBound: number; darkBound: number }
export const WHITE_INK: string
export function inkFor(fill: string, darkInk: string): string
export function encodePreset(preset: Preset): string
export function decodePreset(code: string): Preset
export function buildTheme(preset: Preset, tokenDocs: { primitives: unknown; dark: unknown; light: unknown; control: unknown }): BuiltTheme
export function themeCss(preset: Preset, themes: BuiltTheme['themes']): string
