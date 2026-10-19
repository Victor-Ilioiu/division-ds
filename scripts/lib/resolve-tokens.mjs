function get(obj, path) {
  return path.split('.').reduce((node, key) => node?.[key], obj)
}

function resolveValue(value, primitives, semantic) {
  const alias = typeof value === 'string' && value.match(/^\{(.+)\}$/)
  if (!alias) return value
  const path = alias[1]
  const node = get(primitives, path) ?? get(semantic, path)
  if (!node) throw new Error(`Token alias points nowhere: {${path}}`)
  return resolveValue(node.$value, primitives, semantic)
}

function flatten(node, prefix, primitives, semantic, out) {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('$')) continue
    const path = prefix ? `${prefix}-${key}` : key
    if (value && typeof value === 'object' && '$value' in value) {
      out[`--${path}`] = resolveValue(value.$value, primitives, semantic)
    } else if (value && typeof value === 'object') {
      flatten(value, path, primitives, semantic, out)
    }
  }
  return out
}

export function resolveTokens(primitives, semantic) {
  return flatten(semantic.color.semantic, 'color', primitives, semantic, {})
}
