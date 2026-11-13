// The one ranking for "find me the thing for X". The MCP server's `search` tool and the docs site's
// top-bar search both call it, so an agent and a person typing the same words get the same order.
// Pure and dependency-free: it runs in Node and in the browser.

export const words = text => String(text).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)

// Words that say nothing about the component. Left in, "a" and "an" prefix-match half the
// summaries, so "pick a country" ranked on filler (issue #2).
// "one" stays: it is what tells Select from MultiSelect. Dropped only when the query has another
// word, so a search for "the" alone still works.
const STOP = new Set(['a', 'an', 'the', 'of', 'to', 'for', 'from', 'in', 'on', 'with', 'and', 'or', 'some', 'i', 'me', 'my', 'user', 'users', 'let', 'lets'])

// Ways people say the same intent. A query word also matches the other words of its group, so
// "pick a country" and "choose an option" reach Select, whose own words are select and choice.
const SYNONYMS = [
  ['pick', 'choose', 'select', 'choice', 'option'],
]
const variants = term => {
  const group = SYNONYMS.find(g => g.includes(term))
  return group ? [term, ...group.filter(w => w !== term)] : [term]
}

/** A scorer for one query. `title` is the names, `body` the summary; `props` (descriptions) and
 *  `propNames` count once each, as hints, so a long prop table does not outrank a component or
 *  token whose own summary is about the query. 0 means no match. */
export function scorer(query) {
  const all_ = words(query)
  const kept = all_.filter(w => !STOP.has(w))
  const terms = (kept.length ? kept : all_).map(variants)
  return (title, body, props = '', propNames = '') => {
    if (terms.length === 0) return 0
    const t = words(title).join(' ')
    const b = words(body)
    const p = words(props)
    const n = words(propNames)
    const tw = t.split(' ')
    const inTitle = vs => vs.some(v => t.includes(v))
    // A name that is the word beats a name that contains it: Select over MultiSelect for "select".
    const titleWord = vs => (vs.some(v => tw.includes(v)) ? 1 : 0)
    const bodyHits = vs => b.filter(w => vs.some(v => w.startsWith(v))).length
    const inMain = vs => inTitle(vs) || bodyHits(vs) > 0
    // Every word of the query in the name or summary beats one word found often: "page
    // background" is the surface token, not PageHeader, whose name matches "page" alone.
    const all = terms.length > 1 && terms.every(inMain) ? 5 : 0
    return all + terms.reduce((sum, vs) => sum + (inTitle(vs) ? 3 + titleWord(vs) : 0) + Math.min(bodyHits(vs), 3) + (inMain(vs) ? 0 : n.some(w => vs.some(v => w.startsWith(v))) ? 2 : p.some(w => vs.some(v => w.startsWith(v))) ? 1 : 0), 0)
  }
}
