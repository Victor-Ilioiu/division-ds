// The MCP Apps host adapter, as CSS. Inside Claude or ChatGPT an app runs in an iframe, and the
// host writes its style variables onto <html> as inline custom properties
// (`applyHostStyleVariables` in @modelcontextprotocol/ext-apps). This turns tokens/host/mcp-apps.json
// into the rules that point Division's semantic tokens at those variables under data-host="mcp",
// with Division's own value as each var()'s fallback.
//
// Two names are shared by both vocabularies: `--color-text-primary` and `--color-text-secondary`
// (and Tailwind's `--font-mono`). They need no mapping and cannot have one: the host's inline value
// on <html> already beats the stylesheet's, and `--x: var(--x, ...)` is a cycle, which makes the
// property invalid and paints nothing. `hostAdapterCss` refuses such an entry.

/** McpUiStyleVariableKey from @modelcontextprotocol/ext-apps: every variable a host may send. */
export const HOST_VARIABLES = new Set([
  ...['primary', 'secondary', 'tertiary', 'inverse', 'ghost', 'info', 'danger', 'success', 'warning', 'disabled'].flatMap(
    role => [`--color-background-${role}`, `--color-text-${role}`, `--color-border-${role}`]
  ),
  ...['primary', 'secondary', 'inverse', 'info', 'danger', 'success', 'warning'].map(role => `--color-ring-${role}`),
  '--font-sans',
  '--font-mono',
  ...['normal', 'medium', 'semibold', 'bold'].map(w => `--font-weight-${w}`),
  ...['xs', 'sm', 'md', 'lg'].flatMap(s => [`--font-text-${s}-size`, `--font-text-${s}-line-height`]),
  ...['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'].flatMap(s => [`--font-heading-${s}-size`, `--font-heading-${s}-line-height`]),
  ...['xs', 'sm', 'md', 'lg', 'xl', 'full'].map(s => `--border-radius-${s}`),
  '--border-width-regular',
  ...['hairline', 'sm', 'md', 'lg'].map(s => `--shadow-${s}`),
])

export const HOST_SELECTOR = '[data-host="mcp"]'

/** The adapter's two rules (dark fallbacks, then light), or throws on an entry that would paint
 *  nothing. `dark` and `light` are the resolved semantic tokens of each theme; `shared` holds
 *  theme-independent fallbacks (the font stacks). */
export function hostAdapterCss(map, dark, light, shared = {}) {
  const problems = []
  for (const [division, host] of Object.entries(map)) {
    if (!HOST_VARIABLES.has(host)) problems.push(`${host} is not a host style variable (McpUiStyleVariableKey)`)
    if (division === host) problems.push(`${division} maps onto itself: the host already sets it, drop the entry`)
    const known = division in shared || (division in dark && division in light)
    if (!known) problems.push(`${division} is not a Division token in both themes`)
  }
  if (problems.length > 0) throw new Error(`tokens/host/mcp-apps.json: ${problems.join('; ')}`)

  const entries = Object.entries(map)
  const line = ([division, host], value) => `  ${division}: var(${host}, ${value});`
  const darkBlock = entries.map(e => line(e, shared[e[0]] ?? dark[e[0]])).join('\n')
  // Shared fallbacks do not differ by theme, so the light rule only re-declares the colours.
  const lightBlock = entries.filter(([division]) => !(division in shared)).map(e => line(e, light[e[0]])).join('\n')

  return `${HOST_SELECTOR} {
${darkBlock}
}

[data-theme="light"] ${HOST_SELECTOR}, ${HOST_SELECTOR}[data-theme="light"] {
${lightBlock}
}`
}
