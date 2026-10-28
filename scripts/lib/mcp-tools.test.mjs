import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createTools, REGISTRY_BASE, ToolError } from './mcp-tools.mjs'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = path => JSON.parse(readFileSync(join(REPO_ROOT, path), 'utf8'))
const manifest = read('public/manifest/components.json')
const tokens = read('public/manifest/tokens.json')

// The real manifests, so a tool that drifts from their shape fails here, not in an agent's session.
function tools({ docs = true } = {}) {
  const list = createTools({
    manifest,
    tokens,
    version: '9.9.9',
    readDoc: docs ? slug => readFileSync(join(REPO_ROOT, 'public/docs/components', `${slug}.md`), 'utf8') : undefined,
    readChecklist: () => readFileSync(join(REPO_ROOT, 'skills/division-ds/commands/review.md'), 'utf8'),
  })
  return Object.fromEntries(list.map(tool => [tool.name, tool]))
}

describe('createTools', () => {
  const t = tools()

  it('serves the eight tools, each with an object schema', () => {
    expect(Object.keys(t)).toEqual([
      'list_components', 'get_component', 'search', 'get_tokens',
      'validate_code', 'check_contrast', 'get_add_command', 'get_review_checklist',
    ])
    for (const tool of Object.values(t)) expect(tool.inputSchema.type).toBe('object')
  })

  it('stamps every reply with the version and the data it read', () => {
    expect(t.list_components.run({})).toContain(`(division-ds 9.9.9; data: ${manifest.components.length} components, ${tokens.tokens.length} tokens.`)
  })

  it('lists every component, or one tier', () => {
    expect(t.list_components.run({}).match(/^- /gm)).toHaveLength(manifest.components.length)
    const atoms = t.list_components.run({ tier: 'atoms' })
    expect(atoms).toContain('- Button (atoms)')
    expect(atoms).not.toContain('(organisms)')
  })

  it('returns the component page, by name or slug, and only props on request', () => {
    const page = readFileSync(join(REPO_ROOT, 'public/docs/components/icon-button.md'), 'utf8')
    expect(t.get_component.run({ name: 'icon-button' }).startsWith(page)).toBe(true)
    expect(t.get_component.run({ name: 'IconButton' })).toBe(t.get_component.run({ name: 'icon-button' }))
    const props = t.get_component.run({ name: 'Button', section: 'props' })
    expect(props).toContain("import { Button")
    expect(props).toMatch(/- variant: 'primary' \| 'secondary'/)
    expect(props).not.toContain('## Examples')
  })

  it('falls back to the manifest when the page is not shipped', () => {
    const page = tools({ docs: false }).get_component.run({ name: 'Button' })
    expect(page).toContain('## Keyboard')
    expect(page).toContain('- Enter: ')
    expect(page).toContain('## Examples')
    expect(page).toContain('<Button variant="primary">')
  })

  it('suggests the nearest name for an unknown component', () => {
    expect(() => t.get_component.run({ name: 'Buton' })).toThrow(/Did you mean Button\?/)
    expect(() => t.get_component.run({ name: 'Buton' })).toThrow(ToolError)
  })

  it('finds components and tokens by purpose, and never a primitive', () => {
    const hits = t.search.run({ query: 'confirm' })
    expect(hits).toContain('AlertDialog (component)')
    const background = t.search.run({ query: 'page background' })
    expect(background).toContain('--color-surface-base (semantic token)')
    expect(t.search.run({ query: 'signal', limit: 50 })).not.toContain('(primitive token)')
    expect(t.search.run({ query: 'zzqqxx' })).toMatch(/^Nothing matches/)
  })

  it('gives themed tokens both values, and hides primitives unless asked', () => {
    const semantic = t.get_tokens.run({ query: 'surface-base' })
    expect(semantic).toContain('--color-surface-base (semantic) = dark #07080b, light #f2f4f8')
    expect(t.get_tokens.run({})).not.toContain('(primitive)')
    expect(t.get_tokens.run({ layer: 'primitive' })).toContain('(primitive)')
  })

  it('validates code with the same gates as division-ds check', () => {
    const code = [
      "import { Button } from '../components/atoms/button/Button'",
      'export const X = () => (',
      '  <div className="bg-red-500">',
      '    <Button variant="huge">Save</Button>',
      '    <Button>Cancel</Button>',
      '  </div>',
      ')',
    ].join('\n')
    const out = t.validate_code.run({ code, filename: 'src/pages/X.tsx' })
    expect(out).toContain('3 finding(s) in src/pages/X.tsx')
    expect(out).toContain('[token-discipline] line 3: bg-red-500')
    expect(out).toContain('[button-spacing] line 3')
    expect(out).toContain('[props] line 4: variant="huge"')
  })

  it('passes clean code and says what it did not check', () => {
    const code = "export const X = () => <p className=\"text-[var(--color-text-primary)]\">Hi</p>"
    expect(t.validate_code.run({ code })).toMatch(/^No findings in Screen\.tsx[\s\S]*Not checked: how the screen behaves/)
    expect(() => t.validate_code.run({ code, filename: 'a.css' })).toThrow(ToolError)
  })

  it('measures contrast in both themes, following component tokens to their colour', () => {
    const out = t.check_contrast.run({ foreground: '--component-button-primary-text', background: '--component-button-primary-fill' })
    expect(out.match(/PASS/g)).toHaveLength(2)
    const fail = t.check_contrast.run({ foreground: '#777777', background: '#888888' })
    expect(fail.match(/FAIL/g)).toHaveLength(2)
    expect(fail).toContain('Pick another pair')
    // 3:1 is enough for large text where normal text fails.
    expect(t.check_contrast.run({ foreground: '#767676', background: '#ffffff', use: 'large' })).not.toContain('FAIL')
    expect(() => t.check_contrast.run({ foreground: '--color-text-nope', background: '#fff' })).toThrow(/No token --color-text-nope/)
  })

  it('composites a translucent token over the page', () => {
    const translucent = tokens.tokens.find(token => typeof token.value === 'object' && token.value.dark.startsWith('rgba'))
    expect(translucent).toBeDefined()
    expect(t.check_contrast.run({ foreground: '--color-text-primary', background: translucent.name })).toMatch(/dark: \d/)
  })

  it('builds the shadcn command from slugs, whose registry files exist', () => {
    const out = t.get_add_command.run({ components: ['IconButton', 'alert-dialog'] })
    expect(out).toContain(`${REGISTRY_BASE}/icon-button.json ${REGISTRY_BASE}/alert-dialog.json`)
    for (const slug of ['icon-button', 'alert-dialog', 'division-ds-all']) expect(existsSync(join(REPO_ROOT, 'public/r', `${slug}.json`))).toBe(true)
    expect(t.get_add_command.run({})).toContain('division-ds-all.json')
    expect(() => t.get_add_command.run({ components: ['Nope'] })).toThrow(ToolError)
  })

  it('serves the review checklist', () => {
    expect(t.get_review_checklist.run({})).toContain('# Division DS: review')
  })
})
