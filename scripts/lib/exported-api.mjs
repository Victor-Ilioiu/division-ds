// Reads what a source file exports besides its components: the types an example needs to
// annotate its data (`DataTableColumn`, `ToastOptions`) and the helpers it calls (`sortRows`,
// `useFieldErrors`). The first docs-only eval round found these in examples with no definition
// anywhere an agent could read; this prints them from the source, so they cannot drift.
import ts from 'typescript'

const isExported = node => node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)

/** The declaration with its doc comment, as written. */
const withDocs = (node, source) => source.text.slice(node.getStart(source, true), node.end).trim()

/** A function as a declaration: doc comment and signature, no body. */
function signature(node, source) {
  const end = node.body ? node.body.getStart(source) : node.end
  return source.text.slice(node.getStart(source, true), end).trim().replace(/\s*\{?$/, '')
}

/**
 * The exported, non-component API of one file: `[{ name, kind: 'type' | 'function' | 'const', code }]`.
 * `only`, when given, keeps just those names (a barrel's export list). A name starting with a
 * capital that is a function is a component, and is left to the props table.
 */
export function exportedApi(text, fileName, only) {
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const wanted = name => !only || only.includes(name)
  const out = []
  for (const statement of source.statements) {
    if (!isExported(statement)) continue
    if ((ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) && wanted(statement.name.text)) {
      out.push({ name: statement.name.text, kind: 'type', code: withDocs(statement, source) })
    } else if (ts.isFunctionDeclaration(statement) && statement.name && wanted(statement.name.text)) {
      if (/^[A-Z]/.test(statement.name.text)) continue
      out.push({ name: statement.name.text, kind: 'function', code: signature(statement, source) })
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !wanted(declaration.name.text)) continue
        const name = declaration.name.text
        // A capitalised const that is not SHOUTING_CASE is a component alias (`Sheet = Dialog`).
        if (/^[A-Z]/.test(name) && !/^[A-Z0-9_]+$/.test(name)) continue
        // A long constant is named, not printed: its doc comment and its first line say what it is.
        const code = withDocs(statement, source)
        const declared = source.text.slice(statement.getStart(source), statement.end)
        const docs = code.slice(0, code.length - declared.length)
        out.push({ name, kind: 'const', code: code.length > 600 ? `${docs}${declared.split('\n')[0]} …` : code })
      }
    }
  }
  return out
}
