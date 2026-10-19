// The component layer is the third DTCG tier (primitive -> semantic -> component). Unlike the
// semantic layer, it is NOT resolved to a literal value: a component token aliases a semantic
// one, whose value differs per theme, so resolving it here would need one block per theme.
// Emitting a var() reference instead lets a single :root block serve both themes and leaves the
// theme switch where it already lives, on [data-theme].

/** {color.semantic.accent.signal.fill} -> var(--color-accent-signal-fill)
 *
 *  Two separate checks, because validating only the first used to be enough to let a typo ship:
 *  the LAYER must be `color.semantic.*`, and — when the caller supplies the resolved semantic
 *  key set — the TARGET must actually be a token that exists. Without the second,
 *  `{color.semantic.accent.signal.filll}` passed the regex, emitted
 *  `var(--color-accent-signal-filll)`, and resolved to nothing at runtime with no build error
 *  anywhere: an undefined custom property just makes the declaration invalid at computed-value
 *  time and the element paints unstyled. */
function aliasToVar(value, knownSemanticVars) {
  const match = typeof value === 'string' && value.match(/^\{color\.semantic\.(.+)\}$/)
  if (!match) {
    if (typeof value === 'string' && value.startsWith('{')) {
      throw new Error(
        `Component token alias must point at the semantic layer, got ${value}. ` +
          'Components never reach past semantic to a primitive ramp step.'
      )
    }
    return value
  }
  const cssVar = `--color-${match[1].split('.').join('-')}`
  if (knownSemanticVars && !knownSemanticVars.has(cssVar)) {
    throw new Error(
      `Component token alias ${value} names no semantic token. It would emit var(${cssVar}), ` +
        'which is undefined at runtime — a silent, unstyled element, not a build error.'
    )
  }
  return `var(${cssVar})`
}

function flatten(node, prefix, out, knownSemanticVars) {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('$')) continue
    const path = prefix ? `${prefix}-${key}` : key
    if (value && typeof value === 'object' && '$value' in value) {
      out[`--${path}`] = aliasToVar(value.$value, knownSemanticVars)
    } else if (value && typeof value === 'object') {
      flatten(value, path, out, knownSemanticVars)
    }
  }
  return out
}

/**
 * @param componentDoc the parsed `tokens/component/*.json`
 * @param knownSemanticVars optional iterable of resolved semantic CSS variable names
 *   (`--color-...`). Supply it and every alias target is checked for existence; omit it and only
 *   the layer is checked, which is all a consumer that has no theme files loaded can do.
 */
export function resolveComponentTokens(componentDoc, knownSemanticVars) {
  const known = knownSemanticVars ? new Set(knownSemanticVars) : undefined
  return flatten(componentDoc.component, 'component', {}, known)
}
