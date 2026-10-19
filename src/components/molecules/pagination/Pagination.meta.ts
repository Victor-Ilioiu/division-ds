import type { ComponentMeta } from '../../docs/meta'

export const meta: ComponentMeta = {
  name: 'Pagination',
  title: 'Pagination',
  tier: 'molecules',
  slug: 'pagination',
  summary:
    "Moves through a long list one page at a time. The current page gets the signal fill. Where there are too many pages to fit, a gap stands in for the run that's hidden.",
  anatomy: [
    { part: 'nav', description: "The navigation region, named 'Pagination'." },
    {
      part: 'Previous / Next',
      description:
        "Ghost IconButtons (icon-only buttons with no fill). At the first and last page they're aria-disabled rather than disabled. ARIA (Accessible Rich Internet Applications) attributes tell screen readers about a control, and aria-disabled only marks the button as unavailable. It stays a real stop when you press Tab, so keyboard focus never drops to the page body when one stops working.",
    },
    { part: 'Page', description: "A small Button named 'Page n', with tabular figures (digits that all take the same width)." },
    {
      part: 'Current page',
      description:
        "The primary fill, with aria-current=page so screen readers say it's the current one. It isn't disabled, so Tab still reaches it.",
    },
    { part: 'Gap', description: "An ellipsis that stands for two or more hidden pages. It's aria-hidden, so screen readers skip it." },
    { part: 'First / Last', description: 'Optional (showFirstLast). Ghost IconButtons, aria-disabled at the first and last page.' },
    { part: 'Readout or page Select', description: "Takes the place of the page buttons when variant is 'compact' or 'select'." },
    { part: 'Range and rows per page', description: 'Optional (totalItems, pageSize, onPageSizeChange). These turn the control into a table footer: the range at the start, the controls at the end.' },
    { part: 'Go to page', description: 'Optional (showJump). A small number Input with a visible label, and a Go button.' },
  ],
  props: [
    { name: 'page', type: 'number', description: 'Counts from 1. A number outside the range is pulled back into it.' },
    { name: 'pageCount', type: 'number', description: 'Below 1, nothing renders.' },
    {
      name: 'onPageChange',
      type: '(page: number) => void',
      description: "It's never called with the page you're already on.",
    },
    {
      name: 'variant',
      type: "'numbered' | 'compact' | 'select'",
      default: "'numbered'",
      description:
        "What sits between Previous and Next: the page buttons, a 'Page 3 of 20' readout (which screen readers announce politely, without interrupting, when it changes), or a page Select. Only use 'select' up to a few dozen pages.",
    },
    { name: 'siblings', type: 'number', default: '1', description: "How many pages show on each side of the current page, for 'numbered'." },
    { name: 'showFirstLast', type: 'boolean', default: 'false', description: 'Adds First page and Last page icon buttons at the ends. Like Previous and Next, they go aria-disabled at the first and last page.' },
    { name: 'showLabels', type: 'boolean', default: 'false', description: "Shows Previous and Next as text buttons ('Previous', 'Next') with their chevrons, instead of icons alone." },
    { name: 'showJump', type: 'boolean', default: 'false', description: "Adds a 'Go to page' field. Enter or Go jumps there, and a number past either end goes to that end." },
    { name: 'totalItems', type: 'number', description: "Together with pageSize, it shows the range on view ('21–40 of 400') at the start and lays the control out as a table footer." },
    { name: 'pageSize', type: 'number', description: 'Items per page, used for the range text and the rows-per-page Select.' },
    { name: 'onPageSizeChange', type: '(pageSize: number) => void', description: "Together with pageSize, it shows a rows-per-page Select. When it fires, reset page to 1: the old page may not exist any more." },
    { name: 'pageSizeOptions', type: 'number[]', default: '[10, 20, 50, 100]', description: 'The rows-per-page choices.' },
    { name: 'label', type: 'string', default: "'Pagination'", description: 'The name of the nav landmark (a region screen readers can jump to).' },
    { name: 'className', type: 'string', description: 'Added to the nav element.' },
    { name: 'ref', type: 'Ref<HTMLElement>', description: 'Passed through to the nav DOM node (the element in the page).' },
  ],
  keyboard: [
    { keys: ['Tab'], does: 'Moves across Previous, each page, and Next.' },
    { keys: ['Enter', 'Space'], does: 'Goes to that page.' },
    { keys: ['Enter'], does: 'In the Go to page field, jumps to the page you typed.' },
  ],
  useWhen: 'Moving through a long list or table one page at a time.',
  notFor: "Steps in a form: use Stepper. Fewer than two pages: don't render anything.",
  dos: [
    "Say how many results there are somewhere near it: 'Showing 41 to 60 of 312'.",
    'After a change, move focus to the top of the new page of results.',
    'Keep siblings at 1 on narrow layouts.',
    "Under a data table, pass totalItems and pageSize. The footer then says what's on view, so you don't need a separate line of text.",
    "Use variant 'compact' where space is tight, such as a card or a phone layout.",
  ],
  donts: [
    "Don't paginate fewer than two pages; render nothing.",
    "Don't disable the current page; Tab would skip it.",
    "Don't use pagination for steps in a form.",
    "Don't use variant 'select' for hundreds of pages. A list that long needs showJump instead.",
    "Don't round the buttons into circles or pills; the square and the cut corner are this system's shape.",
  ],
}
