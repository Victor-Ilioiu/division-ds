// The inline-card limits of MCP Apps hosts, as a gate. Claude's design guidelines and OpenAI's
// Apps SDK UI guidelines agree on an inline card: at most two actions, no nested scrolling (the
// card auto-fits its content and the host clips what overflows), and no menus or popovers (they
// are clipped by the iframe or fight the host's z-index). A screen opts in by marking the card:
// `<Card data-host-mode="inline">`. Only marked elements are judged.
//
// It reuses button-spacing's JSX scanner, so it has the same blind spots: mapped or conditional
// children, and anything rendered by a component defined elsewhere, are invisible to it.
import { buildTree, isButtonLike, lineColAt, lineIndex, tokenizeTags } from './button-spacing.mjs'

export const MAX_INLINE_ACTIONS = 2

/** Division components that open a floating layer: a menu, a listbox or a tooltip. */
export const POPOVER_TAGS = new Set(['DropdownMenu', 'Select', 'MultiSelect', 'Tooltip', 'CommandPalette', 'Dialog', 'Sheet', 'AlertDialog'])

const SCROLL_CLASS = /(^|[\s'"`])overflow(-[xy])?-(auto|scroll)(?=[\s'"`]|$)/

const isInline = node => node.attrs.get('data-host-mode') === 'inline'

/** Every rule an inline-marked element in `text` breaks: `{ line, column, rule, found, fix }`. */
export function findInlineViolations(text) {
  const tree = buildTree(tokenizeTags(text))
  const offsets = lineIndex(text)
  const violations = []
  const at = (node, rule, found, fix) => violations.push({ ...lineColAt(offsets, node.start), rule, found, fix })

  function judge(card) {
    let actions = 0
    const walk = node => {
      for (const child of node.children) {
        // An asChild wrapper and its Button are one action: count it and do not descend.
        if (isButtonLike(child)) {
          actions++
          continue
        }
        if (POPOVER_TAGS.has(child.name)) {
          at(child, 'inline-no-popover', `<${child.name}> inside an inline card`, 'Use visible controls instead (SegmentedControl, Switch, Radio), or move this to fullscreen.')
        }
        if (SCROLL_CLASS.test(child.attrs.get('className') ?? '')) {
          at(child, 'inline-no-nested-scroll', `<${child.name}> scrolls inside an inline card`, 'Let the card grow to its content, or request fullscreen for a scrolling view.')
        }
        walk(child)
      }
    }
    walk(card)
    if (actions > MAX_INLINE_ACTIONS) {
      at(card, 'inline-max-actions', `${actions} actions in an inline card`, `Keep at most ${MAX_INLINE_ACTIONS} (one primary, one secondary); put the rest in fullscreen or in the chat.`)
    }
  }

  const visit = node => {
    if (node.name !== null && isInline(node)) return judge(node)
    node.children.forEach(visit)
  }
  visit(tree)
  return violations.sort((a, b) => a.line - b.line || a.column - b.column)
}

export const formatInlineViolation = (v, path) => `${path}:${v.line}:${v.column}  ${v.found} (${v.rule}). ${v.fix}`
