// A Model Context Protocol server over stdio, for `division-ds mcp`. Hand-written rather than
// built on @modelcontextprotocol/sdk: the npm package has one dependency (typescript) and a tools-
// only server needs four methods. The transport is one JSON-RPC message per line on stdin and
// stdout; anything written to stdout that is not a message breaks the client, so logs go to stderr.
//
// `handle` is pure (a message in, a reply or nothing out) so the tests drive it without a process.
import { ToolError } from './mcp-tools.mjs'

// Newest first. A client asking for one of these gets it back; any other gets the newest, and the
// client decides whether it can work with that (the spec's negotiation).
export const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05']

const INSTRUCTIONS = `Division DS: a React 19, Tailwind 4 and Radix design system.
Before writing a component, call get_component for its props and examples. Use only tokens from get_tokens or search, as var(--name).
Before saying a screen is done, call validate_code on each file you wrote and fix every finding, then go through get_review_checklist.`

/** A JSON-RPC error reply. */
const failure = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } })

/** The first problem with `args` against a tool's input schema, or undefined. Only what the tools
 *  declare: required keys, unknown keys, and the JSON type of each value. */
export function argumentProblem(schema, args) {
  if (args === null || typeof args !== 'object' || Array.isArray(args)) return 'arguments must be an object.'
  const properties = schema.properties ?? {}
  for (const key of schema.required ?? []) if (args[key] === undefined) return `${key} is required.`
  for (const [key, value] of Object.entries(args)) {
    const property = properties[key]
    if (!property) return `Unknown argument ${key}. This tool takes: ${Object.keys(properties).join(', ') || 'nothing'}.`
    const type = Array.isArray(value) ? 'array' : Number.isInteger(value) ? 'integer' : typeof value
    const ok = property.type === type || (property.type === 'number' && type === 'integer')
    if (!ok) return `${key} must be ${/^[aeiou]/.test(property.type) ? 'an' : 'a'} ${property.type}.`
    if (property.enum && !property.enum.includes(value)) return `${key} is one of ${property.enum.join(', ')}.`
    if (property.type === 'array' && property.items?.type && value.some(item => typeof item !== property.items.type)) return `${key} holds ${property.items.type}s.`
  }
  return undefined
}

export function createServer({ tools, version }) {
  const byName = new Map(tools.map(tool => [tool.name, tool]))

  function call(params) {
    const tool = byName.get(params?.name)
    if (!tool) return { content: [{ type: 'text', text: `No tool "${params?.name}". Tools: ${[...byName.keys()].join(', ')}.` }], isError: true }
    const args = params.arguments ?? {}
    const problem = argumentProblem(tool.inputSchema, args)
    if (problem) return { content: [{ type: 'text', text: `${tool.name}: ${problem}` }], isError: true }
    try {
      return { content: [{ type: 'text', text: tool.run(args) }] }
    } catch (error) {
      // A ToolError is the agent's mistake and says how to fix it. Anything else is ours; it is
      // still reported as a tool result, so one bad call does not take the session down.
      const text = error instanceof ToolError ? error.message : `division-ds ${version} failed on ${tool.name}: ${error.message}`
      return { content: [{ type: 'text', text }], isError: true }
    }
  }

  /** One parsed message in; the reply to send, or undefined for a notification. */
  function handle(message) {
    if (message === null || typeof message !== 'object' || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
      return failure(message?.id ?? null, -32600, 'Invalid request.')
    }
    const { id, method, params } = message
    // A notification (no id) never gets a reply, even one we do not understand.
    if (id === undefined) return undefined
    switch (method) {
      case 'initialize': {
        const asked = params?.protocolVersion
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
            capabilities: { tools: {} },
            serverInfo: { name: 'division-ds', version },
            instructions: INSTRUCTIONS,
          },
        }
      }
      case 'ping':
        return { jsonrpc: '2.0', id, result: {} }
      case 'tools/list':
        return { jsonrpc: '2.0', id, result: { tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) } }
      case 'tools/call':
        return { jsonrpc: '2.0', id, result: call(params) }
      default:
        return failure(id, -32601, `Method not found: ${method}`)
    }
  }

  /** Reads messages from `input` line by line and writes replies to `output`. */
  function listen(input, output) {
    let buffer = ''
    const send = reply => reply && output.write(JSON.stringify(reply) + '\n')
    input.setEncoding('utf8')
    input.on('data', chunk => {
      buffer += chunk
      let newline
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newline).trim()
        buffer = buffer.slice(newline + 1)
        if (!line) continue
        let message
        try {
          message = JSON.parse(line)
        } catch {
          send(failure(null, -32700, 'Parse error: each line must be one JSON-RPC message.'))
          continue
        }
        send(handle(message))
      }
    })
  }

  return { handle, listen }
}
