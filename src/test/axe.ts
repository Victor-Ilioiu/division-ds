import axeCore, { type AxeResults } from 'axe-core'

/** The exact tag set the Playwright suite uses, so unit and e2e agree on what AA means. */
export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']

export function axeClean(container: Element): Promise<AxeResults> {
  return axeCore.run(container, { runOnly: { type: 'tag', values: WCAG_TAGS } })
}
