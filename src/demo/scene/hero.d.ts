/** The typed surface of hero.js, written by hand: the scene and the models are plain JavaScript
 *  (thousands of lines of geometry code that gain nothing from annotations), and this file is
 *  what lets `HomeHero.tsx` import the one entry point under tsconfig.app's settings. Keep it in
 *  step with `startScene` in hero.js; nothing checks the two against each other. */

export type SceneState = {
  /** True once the shaders are warm and the render loop has drawn its first frames. */
  ready: boolean
  /** 0 to 1 within the current `phase`. */
  progress: number
  phase: string
  assembled: boolean
  /** True while the Assemble or Disassemble sequence is running. */
  busy: boolean
  /** Set when the scene failed to start or lost its WebGL context. The canvas is already gone. */
  error: string | null
}

export type SceneControls = { toggle(): void; dispose(): void }

/** Screenshot switches. `HomeHero.tsx` reads them off the URL; a normal visit passes none. */
export type SceneOptions = {
  /** Start with the kit mounted and the glow on. */
  assembled?: boolean
  /** Freeze the clock at this many seconds: the bob, the sway and the flicker hold still. */
  time?: number
  /** Pin the assemble sequence part-way, 0 to 1. */
  progress?: number
  /** Turn the replica by this many degrees. */
  yaw?: number
}

export function startScene(
  mount: HTMLElement,
  onChange: (state: SceneState) => void,
  signal?: AbortSignal,
  options?: SceneOptions
): Promise<SceneControls>
