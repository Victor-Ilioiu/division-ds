import { describe, expect, it } from 'vitest'
import { exportedApi } from './exported-api.mjs'

const FILE = `import { useState } from 'react'

/** One column of the table. */
export type Column<Row> = {
  key: string
  header: string
}

type Internal = { a: 1 }

/** Sorts rows by a column. */
export function sortRows<Row>(rows: Row[], column: Column<Row>): Row[] {
  return [...rows]
}

export function DataTable() {
  const [x] = useState(0)
  return null
}

export const PAGE_SIZE = 5
export const Sheet = DataTable
`

describe('exportedApi', () => {
  const api = exportedApi(FILE, 'DataTable.tsx')
  const byName = Object.fromEntries(api.map(entry => [entry.name, entry]))

  it('returns exported types whole, with their doc comment', () => {
    expect(byName.Column).toEqual({
      name: 'Column',
      kind: 'type',
      code: '/** One column of the table. */\nexport type Column<Row> = {\n  key: string\n  header: string\n}',
    })
  })

  it('returns a function as its signature, without the body', () => {
    expect(byName.sortRows.code).toBe(
      '/** Sorts rows by a column. */\nexport function sortRows<Row>(rows: Row[], column: Column<Row>): Row[]'
    )
  })

  it('returns a constant, and leaves out components, component aliases and anything not exported', () => {
    expect(byName.PAGE_SIZE.code).toBe('export const PAGE_SIZE = 5')
    expect(Object.keys(byName).sort()).toEqual(['Column', 'PAGE_SIZE', 'sortRows'])
  })

  it('keeps only the names asked for', () => {
    expect(exportedApi(FILE, 'DataTable.tsx', ['sortRows']).map(entry => entry.name)).toEqual(['sortRows'])
  })
})
