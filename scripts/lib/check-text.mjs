// The five consumer gates over one file's text, as data. `division-ds check` runs it per file
// on disk; the MCP server's `validate_code` runs it on a snippet an agent passes in. One function,
// so the two can never disagree about what a finding is.
import { findAiCopyViolations, formatAiCopyViolation } from './ai-copy.mjs'
import { findViolations as buttonSpacing, formatViolation as formatButtonSpacing } from './button-spacing.mjs'
import { findInlineViolations, formatInlineViolation } from './host-inline.mjs'
import { findPropViolations, formatPropViolation } from './props-validator.mjs'
import { findViolations as tokenDiscipline, formatViolation as formatTokenDiscipline } from './token-discipline.mjs'

export const BUTTON_SPACING_FIX =
  'Wrap the buttons in one parent with a flex/grid class and a gap- utility (flex flex-wrap items-center gap-3), and move any margin from the buttons onto it.'

/** Every finding in `text`. `path` decides which gates apply (button spacing and AI copy need JSX) and is
 *  echoed into each finding. `index` is buildIndex(manifest); `tokenNames` the token names. */
export function checkText(text, path, index, tokenNames) {
  const findings = []
  for (const v of tokenDiscipline(text, path, tokenNames)) {
    findings.push({ gate: 'token-discipline', path, line: v.line, rule: v.rule, found: v.found, fix: v.fix, text: formatTokenDiscipline(v) })
  }
  if (/\.[jt]sx$/.test(path)) {
    for (const v of buttonSpacing(text, path)) {
      findings.push({
        gate: 'button-spacing',
        path,
        line: v.line,
        column: v.column,
        rule: 'touching-buttons',
        found: `<${v.tag}> with ${v.count} button-like children`,
        fix: BUTTON_SPACING_FIX,
        text: formatButtonSpacing({ ...v, file: path }),
      })
    }
    for (const v of findInlineViolations(text)) {
      findings.push({ gate: 'host-inline', path, line: v.line, column: v.column, rule: v.rule, found: v.found, fix: v.fix, text: formatInlineViolation(v, path) })
    }
    for (const v of findAiCopyViolations(text, path)) {
      findings.push({ gate: 'ai-copy', path, line: v.line, column: v.column, rule: v.rule, found: v.found, fix: v.fix, text: formatAiCopyViolation(v) })
    }
  }
  for (const v of findPropViolations(text, path, index)) {
    findings.push({ gate: 'props', path, line: v.line, column: v.column, rule: v.rule, found: v.found, fix: v.fix, text: formatPropViolation(v) })
  }
  return findings
}
