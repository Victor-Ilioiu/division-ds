# Pagination

> Moves through a long list one page at a time. The current page gets the signal fill. Where there are too many pages to fit, a gap stands in for the run that's hidden.

- **Best for:** Moving through a long list or table one page at a time.
- **Not for:** Steps in a form: use Stepper. Fewer than two pages: don't render anything.
- Molecule. Source: `src/components/molecules/pagination/Pagination.tsx`
- Rendered docs page: `/components/pagination`

## Import

```tsx
import { Pagination, paginationRange } from 'src/components/molecules/pagination/Pagination'
```

Paths are from the Division DS repository root. Installed with shadcn they start `src/division-ds/` instead of `src/` (`src/division-ds/components/...`); import them relative to your file. An install has no index barrels: import each component from its own file, never from `components/molecules`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `page` | `number` |  | Counts from 1. A number outside the range is pulled back into it. |
| `pageCount` | `number` |  | Below 1, nothing renders. |
| `onPageChange` | `(page: number) => void` |  | It's never called with the page you're already on. |
| `variant` | `'numbered' \| 'compact' \| 'select'` | `'numbered'` | What sits between Previous and Next: the page buttons, a 'Page 3 of 20' readout (which screen readers announce politely, without interrupting, when it changes), or a page Select. Only use 'select' up to a few dozen pages. |
| `siblings` | `number` | `1` | How many pages show on each side of the current page, for 'numbered'. |
| `showFirstLast` | `boolean` | `false` | Adds First page and Last page icon buttons at the ends. Like Previous and Next, they go aria-disabled at the first and last page. |
| `showLabels` | `boolean` | `false` | Shows Previous and Next as text buttons ('Previous', 'Next') with their chevrons, instead of icons alone. |
| `showJump` | `boolean` | `false` | Adds a 'Go to page' field. Enter or Go jumps there, and a number past either end goes to that end. |
| `totalItems` | `number` |  | Together with pageSize, it shows the range on view ('21–40 of 400') at the start and lays the control out as a table footer. |
| `pageSize` | `number` |  | Items per page, used for the range text and the rows-per-page Select. |
| `onPageSizeChange` | `(pageSize: number) => void` |  | Together with pageSize, it shows a rows-per-page Select. When it fires, reset page to 1: the old page may not exist any more. |
| `pageSizeOptions` | `number[]` | `[10, 20, 50, 100]` | The rows-per-page choices. |
| `label` | `string` | `'Pagination'` | The name of the nav landmark (a region screen readers can jump to). |
| `className` | `string` |  | Added to the nav element. |
| `ref` | `Ref<HTMLElement>` |  | Passed through to the nav DOM node (the element in the page). |

## Types and helpers

Exported beside the component, from the same file. Import a type with `import type { ... }`.

```ts
/** Pure. 1-based. Always includes page 1, the last page, the current page and `siblings` pages
 *  either side of it. A gap stands for two or more hidden pages; a single hidden page is shown
 *  instead, because a gap that hides one number costs the same space as the number. */
export function paginationRange(page: number, pageCount: number, siblings = 1): (number | 'gap')[]
```

## Examples

Each is compiled and rendered on the docs page. Imports are omitted; see above.

### Few pages

```tsx
<Pagination page={2} pageCount={5} onPageChange={() => {}} label="Pagination, few pages" />
```

### Many pages

```tsx
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

<ManyPagesExample />
```

### Wider context: two page numbers on each side of the current page

```tsx
<Pagination
  page={10}
  pageCount={20}
  siblings={2}
  onPageChange={() => {}}
  label="Pagination, wider context"
/>
```

### First and last

```tsx
function Live(props: Omit<Parameters<typeof Pagination>[0], 'page' | 'onPageChange'>) {
  const [page, setPage] = useState(4)
  return <Pagination {...props} page={page} onPageChange={setPage} />
}

<Live pageCount={20} showFirstLast label="Pagination, first and last" />
```

### With labels

```tsx
function Live(props: Omit<Parameters<typeof Pagination>[0], 'page' | 'onPageChange'>) {
  const [page, setPage] = useState(4)
  return <Pagination {...props} page={page} onPageChange={setPage} />
}

<Live pageCount={20} showLabels label="Pagination, with labels" />
```

### Compact

```tsx
function Live(props: Omit<Parameters<typeof Pagination>[0], 'page' | 'onPageChange'>) {
  const [page, setPage] = useState(4)
  return <Pagination {...props} page={page} onPageChange={setPage} />
}

<Live variant="compact" pageCount={20} showFirstLast label="Pagination, compact" />
```

### Page select

```tsx
function Live(props: Omit<Parameters<typeof Pagination>[0], 'page' | 'onPageChange'>) {
  const [page, setPage] = useState(4)
  return <Pagination {...props} page={page} onPageChange={setPage} />
}

<Live variant="select" pageCount={12} label="Pagination, page select" />
```

### Go to page

```tsx
function Live(props: Omit<Parameters<typeof Pagination>[0], 'page' | 'onPageChange'>) {
  const [page, setPage] = useState(4)
  return <Pagination {...props} page={page} onPageChange={setPage} />
}

<Live pageCount={48} showJump label="Pagination, go to page" />
```

### Table footer

```tsx
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

<TableFooterExample />
```

## Keyboard

| Keys | Result |
|---|---|
| `Tab` | Moves across Previous, each page, and Next. |
| `Enter` `Space` | Goes to that page. |
| `Enter` | In the Go to page field, jumps to the page you typed. |

## Do

- Say how many results there are somewhere near it: 'Showing 41 to 60 of 312'.
- After a change, move focus to the top of the new page of results.
- Keep siblings at 1 on narrow layouts.
- Under a data table, pass totalItems and pageSize. The footer then says what's on view, so you don't need a separate line of text.
- Use variant 'compact' where space is tight, such as a card or a phone layout.

## Don't

- Don't paginate fewer than two pages; render nothing.
- Don't disable the current page; Tab would skip it.
- Don't use pagination for steps in a form.
- Don't use variant 'select' for hundreds of pages. A list that long needs showJump instead.
- Don't round the buttons into circles or pills; the square and the cut corner are this system's shape.

## Anatomy

- **nav**: The navigation region, named 'Pagination'.
- **Previous / Next**: Ghost IconButtons (icon-only buttons with no fill). At the first and last page they're aria-disabled rather than disabled. ARIA (Accessible Rich Internet Applications) attributes tell screen readers about a control, and aria-disabled only marks the button as unavailable. It stays a real stop when you press Tab, so keyboard focus never drops to the page body when one stops working.
- **Page**: A small Button named 'Page n', with tabular figures (digits that all take the same width).
- **Current page**: The primary fill, with aria-current=page so screen readers say it's the current one. It isn't disabled, so Tab still reaches it.
- **Gap**: An ellipsis that stands for two or more hidden pages. It's aria-hidden, so screen readers skip it.
- **First / Last**: Optional (showFirstLast). Ghost IconButtons, aria-disabled at the first and last page.
- **Readout or page Select**: Takes the place of the page buttons when variant is 'compact' or 'select'.
- **Range and rows per page**: Optional (totalItems, pageSize, onPageSizeChange). These turn the control into a table footer: the range at the start, the controls at the end.
- **Go to page**: Optional (showJump). A small number Input with a visible label, and a Go button.
