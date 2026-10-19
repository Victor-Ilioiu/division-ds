import { describe, expect, it } from 'vitest'
import { extractExamples, injectExampleSources } from './doc-examples.mjs'

const PAGE = `import { Badge } from './Badge'
import { Example } from '../../docs/Example'

const TONES = ['ok', 'hostile'] as const
const UNUSED = 1

function Controlled() {
  const tone = TONES[0]
  return <Badge tone={tone}>On</Badge>
}

export function BadgeDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Plain">
        <Badge>Nominal</Badge>
      </Example>
      <Example caption="Stateful" className="w-full">
        <Controlled />
      </Example>
    </ComponentDocs>
  )
}
`

describe('extractExamples', () => {
  const examples = extractExamples(PAGE)

  it('finds each example with its caption', () => {
    expect(examples.map(example => example.caption)).toEqual(['Plain', 'Stateful'])
  })

  it('returns the children, dedented, with no imports', () => {
    expect(examples[0].source).toBe('<Badge>Nominal</Badge>')
  })

  it('brings the helpers an example uses, transitively and in file order, and no others', () => {
    expect(examples[1].source).toBe(
      [
        "const TONES = ['ok', 'hostile'] as const",
        'function Controlled() {\n  const tone = TONES[0]\n  return <Badge tone={tone}>On</Badge>\n}',
        '<Controlled />',
      ].join('\n\n')
    )
    expect(examples[1].source).not.toContain('UNUSED')
  })
})

describe('injectExampleSources', () => {
  it('adds a source prop to every example and changes nothing else', () => {
    const out = injectExampleSources(PAGE)
    expect(out).toContain('<Example source={"<Badge>Nominal</Badge>"} caption="Plain">')
    expect(out.match(/<Example source=/g)).toHaveLength(2)
    expect(out.replace(/ source=\{"(?:[^"\\]|\\.)*"\}/g, '')).toBe(PAGE)
  })
})
