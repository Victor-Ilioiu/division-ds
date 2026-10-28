import { PassThrough } from 'node:stream'
import { describe, expect, it } from 'vitest'
import { argumentProblem, createServer, PROTOCOL_VERSIONS } from './mcp-server.mjs'
import { ToolError } from './mcp-tools.mjs'

const echo = {
  name: 'echo',
  description: 'Echoes.',
  inputSchema: {
    type: 'object',
    properties: { text: { type: 'string' }, mode: { type: 'string', enum: ['a', 'b'] }, list: { type: 'array', items: { type: 'string' } }, n: { type: 'integer' } },
    required: ['text'],
  },
  run: ({ text }) => {
    if (text === 'mistake') throw new ToolError('Say something else.')
    if (text === 'bug') throw new Error('boom')
    return `echo: ${text}`
  },
}
const server = createServer({ tools: [echo], version: '1.2.3' })
const call = (args, id = 1) => server.handle({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'echo', arguments: args } })

describe('createServer', () => {
  it('initializes with the version the client asked for, or the newest', () => {
    const asked = server.handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } })
    expect(asked.result).toMatchObject({ protocolVersion: '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'division-ds', version: '1.2.3' } })
    expect(asked.result.instructions).toContain('validate_code')
    const unknown = server.handle({ jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '1999-01-01' } })
    expect(unknown.result.protocolVersion).toBe(PROTOCOL_VERSIONS[0])
  })

  it('never replies to a notification', () => {
    expect(server.handle({ jsonrpc: '2.0', method: 'notifications/initialized' })).toBeUndefined()
    expect(server.handle({ jsonrpc: '2.0', method: 'anything/else' })).toBeUndefined()
  })

  it('answers ping, lists tools without their run function, and rejects unknown methods', () => {
    expect(server.handle({ jsonrpc: '2.0', id: 'p', method: 'ping' })).toEqual({ jsonrpc: '2.0', id: 'p', result: {} })
    const list = server.handle({ jsonrpc: '2.0', id: 3, method: 'tools/list' })
    expect(list.result.tools).toEqual([{ name: 'echo', description: 'Echoes.', inputSchema: echo.inputSchema }])
    expect(server.handle({ jsonrpc: '2.0', id: 4, method: 'resources/list' }).error.code).toBe(-32601)
    expect(server.handle({ id: 5, method: 'ping' }).error.code).toBe(-32600)
  })

  it('runs a tool and returns its text', () => {
    expect(call({ text: 'hi' }).result).toEqual({ content: [{ type: 'text', text: 'echo: hi' }] })
  })

  it('reports bad arguments, tool mistakes and crashes as tool errors, not protocol errors', () => {
    expect(call({}).result).toMatchObject({ isError: true, content: [{ text: 'echo: text is required.' }] })
    expect(call({ text: 'x', extra: 1 }).result.content[0].text).toContain('Unknown argument extra')
    expect(call({ text: 'mistake' }).result).toMatchObject({ isError: true, content: [{ text: 'Say something else.' }] })
    expect(call({ text: 'bug' }).result).toMatchObject({ isError: true, content: [{ text: 'division-ds 1.2.3 failed on echo: boom' }] })
    const missing = server.handle({ jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'nope' } })
    expect(missing.result).toMatchObject({ isError: true, content: [{ text: 'No tool "nope". Tools: echo.' }] })
  })

  it('speaks one message per line over a stream, and survives a bad line', async () => {
    const input = new PassThrough()
    const output = new PassThrough()
    server.listen(input, output)
    let received = ''
    output.on('data', chunk => (received += chunk))
    // Split mid-message on purpose: a chunk boundary is not a message boundary.
    input.write('{"jsonrpc":"2.0","id":1,"me')
    input.write('thod":"ping"}\nnot json\n\n{"jsonrpc":"2.0","method":"notifications/initialized"}\n')
    await new Promise(resolve => setImmediate(resolve))
    const lines = received.trim().split('\n').map(line => JSON.parse(line))
    expect(lines).toEqual([
      { jsonrpc: '2.0', id: 1, result: {} },
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error: each line must be one JSON-RPC message.' } },
    ])
  })
})

describe('argumentProblem', () => {
  it('checks types, enums and array items', () => {
    expect(argumentProblem(echo.inputSchema, { text: 1 })).toBe('text must be a string.')
    expect(argumentProblem(echo.inputSchema, { text: 'a', mode: 'c' })).toBe('mode is one of a, b.')
    expect(argumentProblem(echo.inputSchema, { text: 'a', list: [1] })).toBe('list holds strings.')
    expect(argumentProblem(echo.inputSchema, { text: 'a', n: 1.5 })).toBe('n must be an integer.')
    expect(argumentProblem(echo.inputSchema, [])).toBe('arguments must be an object.')
    expect(argumentProblem(echo.inputSchema, { text: 'a', mode: 'b', list: ['x'], n: 2 })).toBeUndefined()
  })
})
