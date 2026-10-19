// Reads the live examples out of a docs page as source text. One function, two callers: the Vite
// plugin in vite.config.ts hands each <Example> its own source, and scripts/build-agent-docs.mjs
// writes the same text into the markdown pages. The examples are compiled and rendered, so the
// code an agent copies is code that is known to work.
import ts from 'typescript'

const dedent = text => {
  const lines = text.replace(/^\s*\n/, '').trimEnd().split('\n')
  const indent = Math.min(...lines.filter(line => line.trim()).map(line => line.match(/^ */)[0].length))
  return lines.map(line => line.slice(indent)).join('\n')
}

/** Top-level declarations of the file by name, minus imports and the exported page itself. */
function localDeclarations(source) {
  const byName = new Map()
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement)) continue
    if (statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue
    if (ts.isFunctionDeclaration(statement) && statement.name) byName.set(statement.name.text, statement)
    if (ts.isTypeAliasDeclaration(statement)) byName.set(statement.name.text, statement)
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) byName.set(declaration.name.text, statement)
      }
    }
  }
  return byName
}

function identifiersIn(node, into = new Set()) {
  if (ts.isIdentifier(node)) into.add(node.text)
  // A block body: forEachChild stops at the first callback that returns something truthy.
  ts.forEachChild(node, child => {
    identifiersIn(child, into)
  })
  return into
}

/**
 * Every `<Example caption="...">` in a docs page: `{ caption, source, insertAt }`.
 *
 * `source` is the example's children, preceded by whichever of the file's own helpers they use
 * (a constant, a small stateful wrapper), followed transitively and kept in file order. Imports
 * are left out: the page that shows the source states the import line once.
 * `insertAt` is the offset just after the tag name, where the plugin adds the `source` prop.
 */
export function extractExamples(text, fileName = 'Docs.tsx') {
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const locals = localDeclarations(source)
  const examples = []

  const visit = node => {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(source) === 'Example') {
      const caption = node.openingElement.attributes.properties.find(
        attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === 'caption'
      )
      const needed = new Set()
      const follow = from => {
        for (const name of identifiersIn(from)) {
          const declaration = locals.get(name)
          if (declaration && !needed.has(declaration)) {
            needed.add(declaration)
            follow(declaration)
          }
        }
      }
      node.children.forEach(follow)
      const helpers = [...needed].sort((a, b) => a.pos - b.pos).map(declaration => declaration.getText(source))
      const body = dedent(text.slice(node.openingElement.end, node.closingElement.pos))
      examples.push({
        caption: caption?.initializer && ts.isStringLiteral(caption.initializer) ? caption.initializer.text : '',
        source: [...helpers, body].join('\n\n'),
        insertAt: node.openingElement.tagName.end,
      })
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return examples
}

/** The page with a `source` prop added to each `<Example>`. */
export function injectExampleSources(text, fileName) {
  let out = text
  for (const example of extractExamples(text, fileName).sort((a, b) => b.insertAt - a.insertAt)) {
    out = `${out.slice(0, example.insertAt)} source={${JSON.stringify(example.source)}}${out.slice(example.insertAt)}`
  }
  return out
}
