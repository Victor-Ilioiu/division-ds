// tokens/usage.json says what each token is for. These two functions keep that file whole and
// turn the token set into the JSON an agent reads (public/manifest/tokens.json).

/** Every way usage.json disagrees with the token set, as sentences that say what to change.
 *  `required` is the names that must each have an entry: semantic, component, spacing, motion. */
export function checkUsage(required, usage) {
  const problems = []
  for (const name of required) {
    const text = usage[name]
    if (typeof text !== 'string' || text.trim().length < 12) {
      problems.push(`${name} has no entry in tokens/usage.json. Add one sentence saying when to use it.`)
    }
  }
  const known = new Set(required)
  for (const name of Object.keys(usage)) {
    if (name.startsWith('$')) continue
    if (!known.has(name)) problems.push(`tokens/usage.json describes ${name}, which is not a token. Remove the entry or fix the name.`)
  }
  return problems
}

/** `$description` of every token under a semantic theme file, keyed by CSS variable name. */
export function measuredNotes(semantic) {
  const out = {}
  const walk = (node, prefix) => {
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('$')) continue
      const name = `${prefix}-${key}`
      if (value && typeof value === 'object' && '$value' in value) {
        if (value.$description) out[`-${name}`] = value.$description
      } else if (value && typeof value === 'object') walk(value, name)
    }
  }
  walk(semantic.color.semantic, '-color')
  return out
}

/** The manifest: one entry per token, in layer order. A value that differs by theme is
 *  `{ dark, light }`; `measured` carries the contrast notes from the theme files. */
export function tokenManifest({ primitive, semanticDark, semanticLight, component, usage, notesDark, notesLight }) {
  const tokens = []
  for (const [name, value] of Object.entries(primitive)) {
    const layer = name.startsWith('--color-') ? 'primitive' : name.startsWith('--spacing-') ? 'spacing' : 'motion'
    tokens.push({ name, layer, value, ...(usage[name] ? { use: usage[name] } : {}) })
  }
  for (const [name, dark] of Object.entries(semanticDark)) {
    const light = semanticLight[name]
    const measured = { ...(notesDark[name] ? { dark: notesDark[name] } : {}), ...(notesLight[name] ? { light: notesLight[name] } : {}) }
    tokens.push({
      name,
      layer: 'semantic',
      value: dark === light ? dark : { dark, light },
      use: usage[name],
      ...(Object.keys(measured).length ? { measured } : {}),
    })
  }
  for (const [name, value] of Object.entries(component)) {
    tokens.push({ name, layer: 'component', value, use: usage[name] })
  }
  return tokens
}
