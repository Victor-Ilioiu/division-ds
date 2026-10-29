// The one ranking for "find me the thing for X". The MCP server's `search` tool and the docs site's
// top-bar search both call it, so an agent and a person typing the same words get the same order.
// Pure and dependency-free: it runs in Node and in the browser.

export const words = text => String(text).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)

/** A scorer for one query. `title` is the names, `body` the summary; `props` (descriptions) and
 *  `propNames` count once each, as hints, so a long prop table does not outrank a component or
 *  token whose own summary is about the query. 0 means no match. */
export function scorer(query) {
  const terms = words(query)
  return (title, body, props = '', propNames = '') => {
    if (terms.length === 0) return 0
    const t = words(title).join(' ')
    const b = words(body)
    const p = words(props)
    const n = words(propNames)
    const inMain = term => t.includes(term) || b.some(w => w.startsWith(term))
    // Every word of the query in the name or summary beats one word found often: "page
    // background" is the surface token, not PageHeader, whose name matches "page" alone.
    const all = terms.length > 1 && terms.every(inMain) ? 5 : 0
    return all + terms.reduce((sum, term) => sum + (t.includes(term) ? 3 : 0) + Math.min(b.filter(w => w.startsWith(term)).length, 3) + (inMain(term) ? 0 : n.some(w => w.startsWith(term)) ? 2 : p.some(w => w.startsWith(term)) ? 1 : 0), 0)
  }
}
