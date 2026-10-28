// The Figma sync gate's logic, kept free of the filesystem so it is unit-testable (the same split
// check-button-spacing.mjs and check-contrast.mjs use). It compares figma/snapshot.json, a copy of
// the Figma library's component properties and variable names read through the Figma MCP, against
// public/manifest/components.json and public/manifest/tokens.json. The code is the source of truth:
// every message says what to change in Figma, then how to refresh the snapshot.

// Motion tokens are not Figma variables in the pilot: Figma variables cannot drive a transition.
const LAYERS_IN_FIGMA = new Set(['primitive', 'semantic', 'component', 'spacing'])

/** The values a prop accepts, as Figma variant strings, or null when the type is not a finite union. */
export function unionValues(type) {
  const parts = type.split('|').map(part => part.trim())
  const values = []
  for (const part of parts) {
    if (part === 'boolean') values.push('false', 'true')
    else if (/^'[^']*'$/.test(part)) values.push(part.slice(1, -1))
    else return null
  }
  return values
}

// What a Figma property type may stand for in code. A BOOLEAN shows or hides a layer, so it can
// stand for a boolean, or for an optional callback or node whose presence adds a part (Tag's
// onDismiss adds the dismiss button).
const fitsBoolean = type => type === 'boolean' || type.includes('=>') || type === 'ReactNode'
const fitsText = type => type.split('|').some(part => part.trim() === 'string')

/** Every drift between the snapshot and the manifests, as one-line messages. Empty means in sync. */
export function findDrift(snapshot, components, tokens) {
  const problems = []
  const byName = new Map(components.map(component => [component.name, component]))
  for (const [name, figma] of Object.entries(snapshot.components)) {
    const code = byName.get(name)
    if (!code) {
      problems.push(`${name}: in Figma (node ${figma.nodeId}) but not in components.json. Rename or remove the Figma component.`)
      continue
    }
    const props = new Map(code.props.map(prop => [prop.name, prop.type]))
    for (const [prop, def] of Object.entries(figma.props)) {
      const where = `${name}.${prop}`
      const type = props.get(prop)
      if (type === undefined) {
        problems.push(`${where}: Figma property with no code prop of that name. Code props: ${[...props.keys()].join(', ')}.`)
        continue
      }
      if (def.type === 'VARIANT') {
        const want = unionValues(type)
        if (!want) {
          problems.push(`${where}: a Figma variant, but the code type ${type} is not a list of values.`)
          continue
        }
        const missing = want.filter(value => !def.values.includes(value))
        const extra = def.values.filter(value => !want.includes(value))
        if (missing.length) problems.push(`${where}: Figma lacks ${missing.join(', ')}. Add the variant${missing.length > 1 ? 's' : ''} in Figma.`)
        if (extra.length) problems.push(`${where}: Figma has ${extra.join(', ')}, which the code does not accept. Remove or rename in Figma.`)
      } else if (def.type === 'BOOLEAN' && !fitsBoolean(type)) {
        problems.push(`${where}: a Figma boolean, but the code type is ${type}.`)
      } else if (def.type === 'TEXT' && !fitsText(type)) {
        problems.push(`${where}: a Figma text property, but the code type is ${type}.`)
      }
    }
  }

  const inFigma = new Set(Object.values(snapshot.variables).flat())
  const tokenNames = new Set(tokens.map(token => token.name.slice(2)))
  for (const name of inFigma) {
    if (!tokenNames.has(name)) problems.push(`variable ${name}: in Figma but no --${name} token exists. Rename or delete it in Figma.`)
  }
  for (const token of tokens) {
    if (LAYERS_IN_FIGMA.has(token.layer) && !inFigma.has(token.name.slice(2))) {
      problems.push(`variable ${token.name.slice(2)}: the ${token.layer} token ${token.name} has no Figma variable. Add it in Figma.`)
    }
  }
  return problems
}

/**
 * Drift between the snapshot and the Code Connect templates (figma/code-connect/<Name>.figma.ts).
 * `templates` maps a component name to its file text. Each Figma variant must be read with
 * getEnum('<prop>', {...}) listing exactly its values: a value the map lacks renders as undefined.
 */
export function findTemplateDrift(snapshot, templates) {
  const problems = []
  for (const [name, figma] of Object.entries(snapshot.components)) {
    const text = templates[name]
    if (text === undefined) {
      problems.push(`${name}: no figma/code-connect/${name}.figma.ts template.`)
      continue
    }
    for (const [, prop] of text.matchAll(/\.get(?:Enum|String|Boolean)\('([^']+)'/g)) {
      if (!(prop in figma.props)) problems.push(`${name}.${prop}: the template reads a property Figma does not have.`)
    }
    for (const [prop, def] of Object.entries(figma.props)) {
      if (def.type !== 'VARIANT') continue
      const call = text.match(new RegExp(`getEnum\\('${prop}', \\{([^}]*)\\}`))
      if (!call) {
        problems.push(`${name}.${prop}: the template does not read it with getEnum('${prop}', {...}).`)
        continue
      }
      const keys = [...call[1].matchAll(/(\w+):/g)].map(match => match[1])
      if ([...keys].sort().join() !== [...def.values].sort().join()) {
        problems.push(`${name}.${prop}: the template maps ${keys.join(', ')}; Figma has ${def.values.join(', ')}.`)
      }
    }
  }
  return problems
}
