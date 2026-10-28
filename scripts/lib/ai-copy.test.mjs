import { describe, expect, it } from 'vitest'
import { findAiCopyViolations } from './ai-copy.mjs'
import { checkText } from './check-text.mjs'

const rules = text => findAiCopyViolations(text, 'Screen.tsx').map(v => v.rule)

describe('ai-in-cta', () => {
  it('flags "AI" in a Button, a button, an IconButton label and an aria-label', () => {
    expect(rules('<Button>Ask AI</Button>')).toEqual(['ai-in-cta'])
    expect(rules('<button type="button">Generate with AI</button>')).toEqual(['ai-in-cta'])
    expect(rules('<IconButton label="AI summary" />')).toEqual(['ai-in-cta'])
    expect(rules('<Button aria-label="Open AI help"><Sparkles /></Button>')).toEqual(['ai-in-cta'])
    expect(rules('<ApprovalRequest title="Send it?" state="pending" approveLabel="Let AI send" />')).toEqual(['ai-in-cta'])
  })

  it('reads literal children and both sides of a ternary', () => {
    expect(rules("<Button>{'Ask AI'}</Button>")).toEqual(['ai-in-cta'])
    expect(rules('<IconButton label={open ? "Close" : "Ask AI"} />')).toEqual(['ai-in-cta'])
  })

  it('leaves alone a word that contains the letters, lower case, prose and variables', () => {
    expect(rules('<Button>Retry email</Button>')).toEqual([])
    expect(rules('<Button>Sign in with OpenAI</Button>')).toEqual([])
    expect(rules('<Button>MAIL</Button>')).toEqual([])
    expect(rules('<Button>Explain this chart</Button>')).toEqual([])
    expect(rules('<p>Built with an AI coding assistant.</p>')).toEqual([])
    expect(rules('<Button>{label}</Button>')).toEqual([])
  })
})

describe('assistant-copy', () => {
  it('flags "answer", "please" and "!" in assistant component labels', () => {
    expect(rules('<ChatThread label="Answers" />')).toEqual(['assistant-copy'])
    expect(rules('<PromptInput label="Ask" placeholder="Please type a question" />')).toEqual(['assistant-copy'])
    expect(rules('<ChatThread label="Chat" busyLabel="Thinking!" />')).toEqual(['assistant-copy'])
    expect(rules('<ApprovalRequest title="Send the answer?" state="pending" />')).toEqual(['assistant-copy'])
  })

  it('never reads message bodies, tool output, suggestions or other components', () => {
    expect(rules('<ChatMessage role="assistant" author="Assistant">Here is the answer!</ChatMessage>')).toEqual([])
    expect(rules('<ToolCall name="search" status="failed" output="The feed did not answer." />')).toEqual([])
    expect(rules('<PromptInput label="Ask" suggestions={["Please summarise this!"]} />')).toEqual([])
    expect(rules('<Alert title="Please try again" />')).toEqual([])
  })
})

describe('checkText', () => {
  it('reports AI copy findings as the ai-copy gate, on JSX files only', () => {
    const findings = checkText('<Button>Ask AI</Button>', 'Screen.tsx', new Map(), [])
    expect(findings).toMatchObject([{ gate: 'ai-copy', rule: 'ai-in-cta', line: 1 }])
    expect(checkText('const x = "<Button>Ask AI</Button>"', 'data.ts', new Map(), [])).toEqual([])
  })
})
