// Types for the two vendored Hairline modules beside this file (plain JavaScript, @ts-nocheck).
type Point = [number, number]

export type HairlineRead = { textContent: string | null }

export type HairlineFigure = {
  name: string
  means: string
  rules: number[]
  range: [number, number, number]
  tour: (Point | null)[] | null
  mount: (
    host: { stage: HTMLElement; svg: SVGSVGElement; read: HairlineRead },
    value: number,
  ) => { set: (value: number) => void; destroy: () => void; stops: Record<string, { drawer: number; face: Point; top: Point }> }
}

export type HairlineKernel = {
  inject: (root: Document | ShadowRoot) => void
  mk: (tag: string, attrs: Record<string, string>, parent: Element) => Element
  tour: (stage: HTMLElement, stops: (Point | null)[], onStop?: (i: number) => void) => { stop: () => void }
}
