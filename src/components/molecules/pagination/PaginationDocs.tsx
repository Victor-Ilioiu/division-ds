import { useState } from 'react'
import { ComponentDocs } from '../../docs/ComponentDocs'
import { meta } from './Pagination.meta'
import { Example } from '../../docs/Example'
import { Pagination } from './Pagination'

/** A live, stateful example over twenty pages: clicking a page or Previous/Next actually moves
 *  the current page, and the count underneath tracks it, so the docs page shows real behaviour
 *  rather than a single frozen frame. */
function ManyPagesExample() {
  const [page, setPage] = useState(1)
  const perPage = 20
  const total = 400
  const from = (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  return (
    <div>
      <Pagination page={page} pageCount={20} onPageChange={setPage} label="Pagination, many pages" />
      <p className="font-mono text-xs text-[var(--color-text-muted)] mt-3">
        Showing {from} to {to} of {total} depots
      </p>
    </div>
  )
}

/** The table-footer form, live: the range and the rows-per-page Select both move the page. */
function TableFooterExample() {
  const total = 397
  const [page, setPage] = useState(2)
  const [pageSize, setPageSize] = useState(20)
  return (
    <div className="w-full">
      <Pagination
        page={page}
        pageCount={Math.ceil(total / pageSize)}
        onPageChange={setPage}
        totalItems={total}
        pageSize={pageSize}
        onPageSizeChange={size => {
          setPageSize(size)
          setPage(1)
        }}
        showFirstLast
        label="Pagination, table footer"
      />
    </div>
  )
}

/** One stateful wrapper for the variants below, so each demo actually moves. */
function Live(props: Omit<Parameters<typeof Pagination>[0], 'page' | 'onPageChange'>) {
  const [page, setPage] = useState(4)
  return <Pagination {...props} page={page} onPageChange={setPage} />
}

export function PaginationDocs() {
  return (
    <ComponentDocs meta={meta}>
      <Example caption="Few pages">
        <Pagination page={2} pageCount={5} onPageChange={() => {}} label="Pagination, few pages" />
      </Example>

      <Example caption="Many pages">
        <ManyPagesExample />
      </Example>

      <Example caption="Wider context: two page numbers on each side of the current page">
        <Pagination
          page={10}
          pageCount={20}
          siblings={2}
          onPageChange={() => {}}
          label="Pagination, wider context"
        />
      </Example>

      <Example caption="First and last">
        <Live pageCount={20} showFirstLast label="Pagination, first and last" />
      </Example>

      <Example caption="With labels">
        <Live pageCount={20} showLabels label="Pagination, with labels" />
      </Example>

      <Example caption="Compact">
        <Live variant="compact" pageCount={20} showFirstLast label="Pagination, compact" />
      </Example>

      <Example caption="Page select">
        <Live variant="select" pageCount={12} label="Pagination, page select" />
      </Example>

      <Example caption="Go to page">
        <Live pageCount={48} showJump label="Pagination, go to page" />
      </Example>

      <Example caption="Table footer">
        <TableFooterExample />
      </Example>
    </ComponentDocs>
  )
}
