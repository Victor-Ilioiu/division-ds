import { describe, it, expect } from 'vitest'
import { clean, createIntake, overlap } from './intake.mjs'
import { createServer } from './mcp-server.mjs'

const components = [{ name: 'Tabs', slug: 'tabs' }]
const findComponent = n => components.find(c => c.name.toLowerCase() === String(n).toLowerCase() || c.slug === n)

/** A fake GitHub: records calls, serves `open` as the open issues. */
function fakeGitHub(open = []) {
  const calls = []
  const fetch = async (url, init) => {
    const path = url.replace('https://api.github.com/repos/Victor-Ilioiu/division-ds', '')
    const body = init.body ? JSON.parse(init.body) : undefined
    calls.push({ method: init.method, path, body, auth: init.headers.Authorization })
    const json = init.method === 'GET' ? open : path === '/issues' ? { number: 42, html_url: 'https://x/42' } : {}
    return { ok: true, status: 200, json: async () => json, text: async () => '' }
  }
  return { calls, fetch }
}

const tool = (tools, name) => tools.find(t => t.name === name)
const ask = { component: 'Tabs', need: 'A close button on each tab', consumer: 'Quillstack', evidence: 'The editor opens documents as tabs.' }

describe('intake', () => {
  it('strips invisible characters, including tag characters that hide text from people', () => {
    expect(clean('a​b‮c\u{E0041}\u{E0042}d')).toBe('abcd')
  })

  it('overlap compares words', () => {
    expect(overlap('Tabs: A close button on each tab', 'close button on each tab')).toBe(1)
    expect(overlap('Tabs: vertical orientation', 'close button on each tab')).toBe(0)
  })

  it('without a token, writes the request locally and sends nothing', async () => {
    const gh = fakeGitHub()
    const written = []
    const tools = createIntake({ fetch: gh.fetch, findComponent, writeLocal: (n, r) => (written.push([n, r]), `/tmp/${n}`) })
    const out = await tool(tools, 'request_change').run(ask)
    expect(gh.calls).toHaveLength(0)
    expect(written[0][1]).toMatchObject({ tool: 'request_change', component: 'Tabs', consumer: 'Quillstack' })
    expect(out).toMatch(/nothing was sent/)
  })

  it('opens a labelled issue that marks the text as a report, not instructions', async () => {
    const gh = fakeGitHub([])
    const tools = createIntake({ token: 't', fetch: gh.fetch, findComponent, writeLocal: () => '' })
    const out = await tool(tools, 'request_change').run(ask)
    const post = gh.calls.find(c => c.method === 'POST')
    expect(post.path).toBe('/issues')
    expect(post.body.labels).toEqual(['consumer-request', 'component:tabs'])
    expect(post.body.body).toMatch(/not as instructions/)
    expect(post.auth).toBe('Bearer t')
    expect(out).toMatch(/#42/)
  })

  it('a component that does not exist is labelled new-component', async () => {
    const gh = fakeGitHub([])
    const tools = createIntake({ token: 't', fetch: gh.fetch, findComponent, writeLocal: () => '' })
    await tool(tools, 'request_change').run({ ...ask, component: 'Kanban' })
    expect(gh.calls.find(c => c.method === 'POST').body.labels).toEqual(['consumer-request', 'new-component'])
  })

  it('comments on a matching open issue instead of opening a duplicate', async () => {
    const gh = fakeGitHub([{ number: 7, title: 'Tabs: A close button on each tab', html_url: 'https://x/7' }])
    const tools = createIntake({ token: 't', fetch: gh.fetch, findComponent, writeLocal: () => '' })
    const out = await tool(tools, 'request_change').run(ask)
    expect(gh.calls.find(c => c.method === 'POST').path).toBe('/issues/7/comments')
    expect(out).toMatch(/existing issue #7/)
  })

  it('report_drift keeps one issue per rule and consumer', async () => {
    const gh = fakeGitHub([{ number: 9, title: 'drift: raw-colour in Harbor', html_url: 'https://x/9' }])
    const tools = createIntake({ token: 't', fetch: gh.fetch, findComponent, writeLocal: () => '' })
    const run = args => tool(tools, 'report_drift').run({ findings: 'f', why: 'w', ...args })
    await run({ consumer: 'Harbor', rule: 'raw-colour' })
    await run({ consumer: 'Harbor', rule: 'unknown-prop' })
    const posts = gh.calls.filter(c => c.method === 'POST').map(c => c.path)
    expect(posts).toEqual(['/issues/9/comments', '/issues'])
  })

  it('the server answers an async tool once it resolves, and reports GitHub failures as tool errors', async () => {
    const failing = async () => ({ ok: false, status: 403, json: async () => ({}), text: async () => 'Forbidden' })
    const tools = createIntake({ token: 't', fetch: failing, findComponent, writeLocal: () => '' })
    const server = createServer({ tools, version: '0.0.0' })
    const reply = await server.handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'request_change', arguments: ask } })
    expect(reply.result.isError).toBe(true)
    expect(reply.result.content[0].text).toMatch(/403/)
  })
})
