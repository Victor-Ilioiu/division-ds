/**
 * The two page layouts of the demo, named.
 *
 * - **Default**: content centred, at most 1200px wide, inside the page gutter (so it never
 *   touches the viewport edge on a small screen). Cart, Care, account, the order pages, Field
 *   notes and the product page use it: put {@link DEFAULT_PAGE} on the page's root element, with
 *   the page's own vertical spacing beside it.
 * - **Full-width**: the page root is just `px-gutter` and the content runs the whole gutter-to-
 *   gutter width. Home, the shop listing, checkout, the status pages and the ops back office.
 * - The four sign-in pages are neither: a single short form stays a narrow (`max-w-md`) column,
 *   centred.
 *
 * `box-content` makes the 1200px the width of the content itself; the gutter (`px-gutter`, from
 * `DemoLayout`'s `--page-gutter`) sits outside it. A narrower measure inside a default page (a
 * form, a paragraph) is left-aligned to this column, never re-centred, so the heading and the
 * content share one left edge.
 */
export const DEFAULT_PAGE = 'box-content mx-auto max-w-[1200px] px-gutter'
