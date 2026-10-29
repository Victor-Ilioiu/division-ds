// The AI copy gate: the parts of the "Assistant copy" rule (AGENTS.md, topic `ai`) that a script
// can check without guessing. Run in a consumer project through `division-ds check` and the MCP
// `validate_code` (both via check-text.mjs).
//
// Where the rules come from: GitLab Pajamas (no "AI" in a call-to-action label: name the action),
// Cloudscape's generative-AI chat pattern ("response", not "answer"; no exclamation points; no
// "please") and Intuit's content design guide on writing about AI. The rest of that guidance
// (who speaks in which person, hedging, naming the model) needs a reader, so it stays prose.
//
// Scope is kept narrow on purpose, because a false positive teaches an agent to stop reading the
// gate:
// - `ai-in-cta`: the word "AI" (upper case, a whole word) in a button's own label: the text of a
//   <Button> or <button>, an <IconButton label>, an `aria-label` on either, and the button props
//   of the assistant components (approveLabel, rejectLabel, jumpLabel). Any button, imported from
//   Division DS or not: a copy rule is about the words, not the component.
// - `assistant-copy`: "answer", "please" or "!" in the interface text of the assistant components
//   (ChatThread, ChatMessage, PromptInput, ApprovalRequest, ToolCall): their label-like string
//   props only. Message bodies, a ToolCall's input and output and PromptInput's suggestions are
//   content written by the person or the model, not the interface, and are never read. A button
//   placed inside one of them (a Button in ChatMessage's `actions`) is its interface too: its label
//   and aria-label are checked the same way (missed by the 2026-10-29 outside test's probe).
// Only literals are read (a string attribute, JSX text, a ternary of two literals). A variable is
// not judged, the same as the props gate.
import ts from 'typescript'
import { scriptKind } from './props-validator.mjs'

const BUTTONS = new Set(['Button', 'button'])
/** Each assistant component's interface-text props. Everything else on them is content or data. */
const ASSISTANT_COPY = {
  ChatThread: ['label', 'busyLabel', 'jumpLabel'],
  ChatMessage: ['author', 'timeLabel'],
  PromptInput: ['label', 'placeholder', 'hint'],
  ApprovalRequest: ['title', 'approveLabel', 'rejectLabel', 'approvedLabel', 'rejectedLabel'],
  ToolCall: ['title'],
}
const BUTTON_PROPS = { IconButton: ['label', 'aria-label'], Button: ['aria-label'], button: ['aria-label'], ApprovalRequest: ['approveLabel', 'rejectLabel'], ChatThread: ['jumpLabel'] }

const AI_WORD = /\bAI\b/
const ASSISTANT_WORDS = [
  { pattern: /\banswer(s|ed|ing)?\b/i, fix: 'Write "response" (or "reply"), not "answer": the assistant responds; it is not always right.' },
  { pattern: /\bplease\b/i, fix: 'Drop "please": the interface states the action plainly.' },
  { pattern: /!/, fix: 'Drop the exclamation point: assistant copy stays calm, whatever the result.' },
]
const AI_FIX = 'Name the action ("Summarize", "Draft a reply"), not the technology: a call to action never says "AI".'

/** The literal strings an attribute can hold, as nodes; none when it is not a literal. */
function literals(initializer) {
  if (!initializer) return []
  if (ts.isStringLiteral(initializer)) return [initializer]
  if (!ts.isJsxExpression(initializer) || !initializer.expression) return []
  const collect = node => {
    while (ts.isParenthesizedExpression(node)) node = node.expression
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node]
    if (ts.isConditionalExpression(node)) return [...collect(node.whenTrue), ...collect(node.whenFalse)]
    return []
  }
  return collect(initializer.expression)
}

/** Every AI copy finding in one file: `{ path, line, column, rule, found, fix }`. */
export function findAiCopyViolations(text, path) {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, scriptKind(path))
  const violations = []
  const add = (node, rule, found, fix) => {
    const at = source.getLineAndCharacterOfPosition(node.getStart(source))
    violations.push({ path, line: at.line + 1, column: at.character + 1, rule, found, fix })
  }
  // How many assistant components the walk is inside: a button in there speaks for the assistant.
  let insideAssistant = 0
  const checkCta = (node, value, where) => {
    if (AI_WORD.test(value)) add(node, 'ai-in-cta', `${where}: "${value.trim()}"`, AI_FIX)
    if (insideAssistant > 0) {
      for (const word of ASSISTANT_WORDS) {
        if (word.pattern.test(value)) add(node, 'assistant-copy', `${where} in an assistant component: "${value.trim()}"`, word.fix)
      }
    }
  }
  const tagOf = node =>
    ts.isJsxElement(node) ? node.openingElement.tagName.getText(source) : ts.isJsxSelfClosingElement(node) ? node.tagName.getText(source) : undefined

  const visit = node => {
    const opensAssistant = tagOf(node) in ASSISTANT_COPY
    if (opensAssistant) insideAssistant++
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tag = node.tagName.getText(source)
      for (const attribute of node.attributes.properties) {
        if (!ts.isJsxAttribute(attribute)) continue
        const prop = attribute.name.getText(source)
        for (const value of literals(attribute.initializer)) {
          if (BUTTON_PROPS[tag]?.includes(prop)) checkCta(value, value.text, `<${tag} ${prop}>`)
          if (ASSISTANT_COPY[tag]?.includes(prop)) {
            for (const word of ASSISTANT_WORDS) {
              if (word.pattern.test(value.text)) add(value, 'assistant-copy', `<${tag} ${prop}>: "${value.text}"`, word.fix)
            }
          }
        }
      }
    }
    if (ts.isJsxElement(node) && BUTTONS.has(node.openingElement.tagName.getText(source))) {
      const tag = node.openingElement.tagName.getText(source)
      const parts = []
      for (const child of node.children) {
        if (ts.isJsxText(child)) parts.push(child.text)
        else if (ts.isJsxExpression(child) && child.expression && (ts.isStringLiteral(child.expression) || ts.isNoSubstitutionTemplateLiteral(child.expression))) {
          parts.push(child.expression.text)
        }
      }
      const label = parts.join(' ').replace(/\s+/g, ' ')
      if (label.trim()) checkCta(node, label, `<${tag}> label`)
    }
    ts.forEachChild(node, visit)
    if (opensAssistant) insideAssistant--
  }
  visit(source)
  return violations.sort((a, b) => a.line - b.line || a.column - b.column)
}

export function formatAiCopyViolation({ path, line, column, rule, found, fix }) {
  return `${path}:${line}:${column}  [${rule}] ${found}\n      ${fix}`
}
